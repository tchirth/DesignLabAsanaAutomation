const stringSimilarity = require('string-similarity')
const asana = require('asana');
const datetime = require('node-datetime');

const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
// Asana function to add to project cleanly
async function add_to_project(task_gid, project_gid) {  
  return await client.tasks.addProjectForTask(task_gid, {project: project_gid, pretty: true});
}
// Function to print to google sheets
async function print_line(columns, sheetName) {
  // validate input
  if (!columns || !columns.length) {
    throw new Error("Please enter an array of elements in the `Columns` parameter above")
  } else if (!Array.isArray(columns)) {
    throw new Error("Column data is not an array. Please enter an array of elements in the `Columns` parameter above.")
  } else if (Array.isArray(columns[0])) {
    throw new Error("Column data is a multi-dimensional array. A one-dimensional is expected. If you're trying to send multiple rows to Google Sheets, search for the action to add multiple rows to Sheets, or try modifying the code for this step.")
  }

  const config = {
    method: "post",
    url: `https://sheets.googleapis.com/v4/spreadsheets/${steps.params.gsheet_id}/values/${sheetName}:append`,
    params: {
      includeValuesInResponse: true,
      valueInputOption: "USER_ENTERED"
    },
    headers: {
      Authorization: `Bearer ${auths.google_sheets.oauth_access_token}`,
    }, 
    data: {
    values: [columns],
    }
  }
  return (await require("@pipedreamhq/platform").axios(this, config)).updates
}
on_hold = stringSimilarity.findBestMatch('On Hold', Object.keys(steps.get_gids.sections)).bestMatch.target
on_hold_gid = steps.get_gids.sections[on_hold]

// Iterate through tasks that have some "added" event
for ([gid, task] of Object.entries(steps.tasks.tasks)) {
  if (task.added.length != 0) {
    if ('section' in task && task.section != steps.get_gids.sections['(no section)'] && task.section != on_hold_gid) {
      // Determine the matching subproject
      project2 = steps.get_gids.matches_s2p[task.section];
      // If the task is not already in that subproject, add it & log the action
      if (!(task.projects.includes(project2)) && (Object.keys(steps.get_gids.matches_s2p).includes(task.section)) ) {
        response = await add_to_project(task_gid = gid, project_gid = project2)
        proj2name = Object.keys(steps.get_gids.projs).find(key => steps.get_gids.projs[key] === project2)
        date = datetime.create().format('Y-m-d')
        time = datetime.create().format('H:M:S')
        row = [date, time, task.task.name, proj2name]
        await print_line(row, 'DownwardActions')
      };
    };
  };
};