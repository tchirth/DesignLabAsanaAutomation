async (event, steps, auths) => {
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
      // const { columns } = params
    
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
    this.log = 0
    
    // Iterate though tasks in master & if the task is not in the subproject matching its section, add to that proj
    for ([gid, task] of Object.entries(steps.master_tasks.tasks)) {
      if ('proj2' in task && task.proj2 != null && !(task.projects.includes(task.proj2)) && task.section != steps.get_gids.sections['(no section)']) {
        // console.log(123)
        project2 = task.proj2;
        response = await add_to_project(task_gid = gid, project_gid = project2)
        proj2name = Object.keys(steps.get_gids.projs).find(key => steps.get_gids.projs[key] === project2)
        date = datetime.create().format('Y-m-d')
        time = datetime.create().format('H:M:S')
        row = [date, time, task.task.name, proj2name]
        await print_line(row, 'DownwardActions')
        this.log += 1
      };
    };
}