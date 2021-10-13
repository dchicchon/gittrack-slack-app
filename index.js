
import Bolt from '@slack/bolt'
import {fetchPastWeek, makeGraph} from './api/fetch.js'
import * as fs from 'fs'
import Database from '@replit/database'
const BOT_TOKEN = process.env['BOT_TOKEN']
const SIGNING_SECRET = process.env['SIGNING_SECRET']

const db = new Database()

const app = new Bolt.App({
  token: BOT_TOKEN,
  signingSecret: SIGNING_SECRET,
})

// reusable function to get the team roster
const getTeamRoster = async (team_id) => {
  let teamRoster = {};

  // check if user is admin/owner here
  const teamJSON = await db.get(team_id);
  let blocks = []
  if (teamJSON) {
    teamRoster = JSON.parse(teamJSON)
    for (const userId in teamRoster) {
      const username = teamRoster[userId];
      const block = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${userId}> : ${username}`
        },
        accessory: {
          type: "button",
          text: {
            type: 'plain_text',
            text: 'Delete'
          },
          style: 'danger',
          value: userId,
          action_id: 'delete_user'
        }
      }
      const divider = {
        type: 'divider'
      }
      blocks.push(block)
      blocks.push(divider)
    }
  }

  // create a block for each person in the teamRoster;

  return blocks
}

// deletes a user from the roster
const deleteFromRoster = async (team, userId) => {
  const teamJSON = await db.get(team);
  if (teamJSON) {
    const teamRoster = JSON.parse(teamJSON);
    delete teamRoster[userId]
    if (Object.keys(teamRoster).length === 0) {
      // delete the team from the database
      await db.delete(team_id)
    } else {
      await db.set(team, JSON.stringify(teamRoster))
    }
  }
}


// should only be able to run this command if you are the owner
app.command("/roster", async ({ say, ack, body, client, context }) => {
  // get all the users in the team and their github usernames
  await ack();
  // check user id in the client?
  try {
    const { user } = await client.users.info({
      user: body.user_id
    })
    if (user.is_admin || user.is_owner) {
      const blocks = await getTeamRoster(body.team_id);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: "modal",
          callback_id: "view_1",
          title: {
            type: "plain_text",
            text: "Configure Student Roster",
          },
          blocks,
        }
      })
    }
    else {
      say("Only an admin or owner has access to this command")
    }
  } catch (error) {
    console.error(error)
  }


})

app.action('delete_user', async ({ ack, client, body, payload }) => {
  await ack();
  await deleteFromRoster(body.team_id, payload.value);

  const blocks = await getTeamRoster(body.team_id);
  try {
    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: {
        type: "modal",
        callback_id: "view_1",
        title: {
          type: "plain_text",
          text: "Configure Student Roster",
        },
        blocks,
      } // use the same view as before
    })
  } catch (error) {
    console.error(error)
  }
})

// allow users to submit their username
app.command('/add-username', async ({ client, body, command, ack }) => {
  await ack();

  // get the current username and place it on 
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "student_view",
        title: {
          type: "plain_text",
          text: "GitTrack",
          emoji: true,
        },
        submit: {
          type: "plain_text",
          text: "Submit",
          emoji: true,
        },
        close: {
          type: "plain_text",
          text: "Cancel",
          emoji: true,
        },
        blocks: [
          {
            type: "input",
            block_id: "username_input",
            element: {
              type: "plain_text_input",
              action_id: "submit_username",
            },
            label: {
              type: "plain_text",
              text: "Add your GitHub username",
              emoji: true,
            },
          },
        ],
      }
    })
  } catch (error) {
    console.error(error)
  }
})

app.view("student_view", async ({ ack, body, view, client }) => {
  await ack();
  const { value } = view.state.values.username_input.submit_username;
  const user = body.user.id;
  // get the teamId
  try {
    // looks like {id: githubUsername}
    const teamJSON = await db.get(body.team.id)
    if (!teamJSON) {
      // create a roster for this team
      const newRoster = {
        [user]: value
      }
      await db.set(body.team.id, JSON.stringify(newRoster))
    } else {
      const teamRoster = JSON.parse(teamJSON);
      teamRoster[user] = value;
      await db.set(body.team.id, JSON.stringify(teamRoster))
    }
    // set the value in the database here
  } catch (error) {
    console.error(error)
  }
})

app.command('/testgraph', async ({ack, client, body}) => {
  await ack();
  await makeGraph();
  // get the channel id
  // add a comment on the image
  // client.files.upload({
  //   channels: body.channel_id,
  //   file: fs.createReadableStream('sharp.png')
  //   // initial_comment: ''
  // })
})

app.command("/getgit", async ({ ack, body, say, client }) => {
  await ack();

  // check if user is admin/owner
  // were going to use the command say with markdown blocks in it of the users git commit data
  try {
    const { user } = await client.users.info({
      user: body.user_id
    })
    if (user.is_admin || user.is_owner) {
      const teamJSON = await db.get(body.team_id)
      if (teamJSON) {
        say("Here is the list of weekly commits")
        const teamRoster = JSON.parse(teamJSON); //Object
        for (const userId in teamRoster) {
          const username = teamRoster[userId]
          const result = await fetchPastWeek(username);
          let count = 0;
          for (const contrib of result.contributions) {
            count += contrib.count
          }
          say({
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<@${userId}> commits this week: ${count}`
                }
              }
            ],
            text: 'Message cannot be displayed'
          })
        }
      } else {
        say("There are no usernames added to this workspace")
      }
    } else {
      say('Only an admin or owner has access to this command')
    }

  }
  catch (error) {
    console.error(error)
  }

})



const start = async () => {
  await app.start(process.env.PORT || 3000)
  console.log("Bolt app started");
}


start();