# GitTrack

## Description
GitTrack is an application that helps track the user commits in your slack workspace.

## Technologies
- [Slack Bolt](https://slack.dev/bolt-js/concepts) - Slack framework for developing workspace applications
- [Cheerio](https://www.npmjs.com/package/cheerio) - Scraping tool to parse Github User pages for contribution data
- [Axios](https://www.npmjs.com/package/axios) - HTTP client used to request Github user pages and retrieve page data
- [Replit](https://www.google.com/search?gs_ssp=eJzj4tVP1zc0TMsyL7LMyipQYDRgdGDwYitKLcjJLAEAaCEHpw&q=replit&rlz=1C1CHBF_enUS846US846&oq=replit&aqs=chrome.1.69i59j46i39i199i275i465j69i59l3j0i512j69i60l2.1490j0j4&sourceid=chrome&ie=UTF-8) - Platform used to develop server applications 
- [Replit Database](https://www.npmjs.com/package/@replit/database) - Database that integrates with Replit platform

## Usage
- Install application to Slack Workspace via [Link]()
- Use commands to add Github usernames, check roster, and list weekly commits

## Commands
- /add-username - Add a Github username for the corresponding slack user
- /roster - Check the list of usernames and their corresponding slack display names for the workspace
- /getget - Get data for the weekly commits for the users in the workspace roster

## Acknowledgements
- [Slack Application Tutorial for Replit](https://www.youtube.com/watch?v=QBRHcGGTRCY)
- [Github Contribution scraping code by user @Sallar](https://github.com/sallar/github-contributions-chart)