async (event, steps, params, auths) => {
    
    const config = {
        method: "post",
        url: `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/:batchUpdate`,
        // params: {
        //   includeValuesInResponse: true,
        //   valueInputOption: "USER_ENTERED"
        // },
        headers: {
        Authorization: `Bearer ${auths.google_sheets.oauth_access_token}`,
        },
        data : {
        'requests': [{
            'addSheet': {
            'properties': {
                'title': steps.body.report_month,
                'tabColor': {
                    'red': 1,
                    'green': 1,
                    'blue': 1,
                }
            }
            }
        }]
        }
    }
    
    // Post data to Google Sheets and return transaction metadata
    return (await require("@pipedreamhq/platform").axios(this, config)).updates
}