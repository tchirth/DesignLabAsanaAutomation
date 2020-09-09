async (event, steps, auths) => {
    const stringSimilarity = require('string-similarity')
    const asana = require('asana');
    const datetime = require('node-datetime');
    
    const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
    // Asana function to add to project cleanly
    async function add_to_project(task_gid, project_gid) {
      return await client.tasks.addProjectForTask(task_gid, { project: project_gid, pretty: true });
    }
    // Asana function to remove from project cleanly
    async function remove_from_project(task_gid, project_gid) {
      return await client.tasks.removeProjectForTask(task_gid, { project: project_gid, pretty: true });
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
    };
    
    agenda = steps.params.header.toLowerCase().concat(' - ', 'meeting agenda')
    agenda = stringSimilarity.findBestMatch(agenda, Object.keys(steps.get_gids.projs)).bestMatch.target
    agenda_gid = steps.get_gids.projs[agenda]
    this.log = { 'adds': 0, 'removes': 0 }
    // Iterate though master tasks
    for ([gid, task] of Object.entries(steps.master_tasks.tasks)) {
      if (task.agendaVal == true) {
        if (!(task.projects.includes(agenda_gid))) { // Task should be in agenda but is not (add)
          response = await add_to_project(task_gid = gid, project_gid = agenda_gid)
          date = datetime.create().format('Y-m-d')
          time = datetime.create().format('H:M:S')
          row = [date, time, task.task.name, 'Added']
          await print_line(row, 'AgendaActions')
          this.log.adds += 1
        };
      } else {
        if (task.projects.includes(agenda_gid)) { //task should not be in agenda, but is (remove)
          response = await remove_from_project(task_gid = gid, project_gid = agenda_gid)
          date = datetime.create().format('Y-m-d')
          time = datetime.create().format('H:M:S')
          row = [date, time, task.task.name, 'Removed']
          await print_line(row, 'AgendaActions')
          this.log.removes += 1
        };
      };
    };
}