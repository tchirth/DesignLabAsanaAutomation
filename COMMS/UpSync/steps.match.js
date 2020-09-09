async (event, steps, auths) => {
    header = steps.params.header.toLowerCase().concat(' - ')
    const asana = require('asana');
    const datetime = require('node-datetime');
    const stringSimilarity = require('string-similarity')
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
    };
    
    master = steps.params.header.toLowerCase().concat(' - ', 'master')
    master = stringSimilarity.findBestMatch(master, Object.keys(steps.get_gids.projs)).bestMatch.target
    master_gid = steps.get_gids.projs[master]
    
    // Iterate though tasks in webhook
    for ([gid, parent] of Object.entries(steps.tasks.tasks)) {
      // Get task data from Asana
      task = await client.tasks.getTask(gid, { 'opt_fields': "name,notes,projects" })
      // Sync Exception
      if (task.notes.substr(0, 20).includes('$DO_NOT_SYNC')) {
        continue;
      };
    
      in_master = (element) => (element.gid == master_gid)
      in_master = task.projects.some(in_master)
      if (in_master == false && Object.values(steps.get_gids.projs).includes(parent)) {
        // MATCH SECTION
        master_section = steps.get_gids.matches_p2s[parent]
        parent_name = Object.keys(steps.get_gids.projs).find(key => steps.get_gids.projs[key] === parent);
    
        // ADD TO MASTER & LOG IT
        response = await client.tasks.addProjectForTask(gid, { project: master_gid, section: master_section, pretty: true });
        section = steps.get_gids.sections[master_section]
        date = datetime.create().format('Y-m-d')
        time = datetime.create().format('H:M:S')
        row = [date, time, task.name, parent_name]
        await print_line(row, 'UpwardActions')
      };
    };
}