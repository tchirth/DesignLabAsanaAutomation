async (event, steps, auths) => {
    const asana = require('asana');
    const stringSimilarity = require('string-similarity')
    const datetime = require('node-datetime')
    
    const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
    
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
    no_section = stringSimilarity.findBestMatch('(no section)', Object.keys(steps.get_gids.sections)).bestMatch.target
    no_section_gid = steps.get_gids.sections[no_section]
    master_gid = steps.get_gids.master_gid
    this.log = {'adds':0, 'removes': 0}
    
    for ([gid, task] of Object.entries(steps.master_tasks.tasks)) {
      if (task.holdVal == true) {
        if (!(task.section == on_hold_gid)) { //Task should be in on hold, but is not (add)
          // console.log('add_to_hold')
          response = await client.tasks.addProjectForTask(gid, {project: master_gid, section: on_hold_gid});
          date = datetime.create().format('Y-m-d')
          time = datetime.create().format('H:M:S')
          row = [date, time, task.task.name, 'Added']
          await print_line(row, 'HoldActions')
          this.log.adds +=1
        };
      } else {
        // console.log(123)
        if (task.section == on_hold_gid) { //Task should not be in on hold, but is (remove)
          // console.log('remove_from_hold')
          response = await client.tasks.addProjectForTask(gid, {project: master_gid, section: no_section_gid, pretty: true});
          date = datetime.create().format('Y-m-d')
          time = datetime.create().format('H:M:S')
          row = [date, time, task.task.name, 'Removed']
          await print_line(row, 'HoldActions')
          this.log.removes +=1
        };
      };
    };
}