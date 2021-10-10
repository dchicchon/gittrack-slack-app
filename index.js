
const { App } = require('@slack/bolt')
const { fetchPastWeek } = require("./api/fetch.js")
const Database = require("@replit/database")
const BOT_TOKEN = process.env['BOT_TOKEN']
const SIGNING_SECRET = process.env['SIGNING_SECRET']
  
const db = new Database()

const app = new App({
  token: BOT_TOKEN,
  signingSecret: SIGNING_SECRET,
})

// reusable function to get the team roster
const getTeamRoster = async (team_id) => {
  let teamRoster = {};
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
app.command("/roster", async ({ack, body, client}) => {
  // get all the users in the team and their github usernames
  await ack();
  const blocks = await getTeamRoster(body.team_id);
  try {
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
  } catch(error) {
    console.error(error)
  }
})

app.action('delete_user', async ({ack, client, body, payload}) => {
  await ack();
  // be sure to remove the user from the roster;
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
  } catch(error) {
    console.error(error)
  }
})

// allow users to submit their username
app.command('/add-username', async({client, body, command, ack}) => {
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
  } catch(error) {
    console.error(error)
  }
})

app.view("student_view", async({ack, body, view, client}) => {
  await ack();
  const {value} = view.state.values.username_input.submit_username;
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
  } catch(error) {
    console.error(error)
  }
})

app.command("/getgit", async ({ack, body, say}) => {
  await ack();
  // were going to use the command say with markdown blocks in it of the users git commit data
  say("Here is the list of weekly commits")
  const teamJSON = await db.get(body.team_id)
  if (teamJSON) {
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
  }
})

const start = async () => {
  await app.start(process.env.PORT || 3000)
  console.log("Bolt app started");
}


start();