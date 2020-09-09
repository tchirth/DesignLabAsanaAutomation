async (event, steps, params, auths) => {
    const stringSimilarity = require('string-similarity')
    const { google } = require('googleapis')
    
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: auths.google_sheets.oauth_access_token })
    const sheets = await google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadhsheetId,
      range: params.range
    })
    // Get and organize project/section matches for all uses
    this.data = response.data.values
    this.sections = {}
    this.projs = {}
    this.matches_s2p = {}
    this.matches_p2s = {}
    for (row of this.data) {
      if (row[0] != '') {
        this.projs[row[0]] = row[1];
      }
      if (row[2] != '') {
        this.sections[row[2]] = row[3];
      };
      if (row[1] != '' && row[2] != '(no section)') {
        this.matches_s2p[row[3]] = row[1]
        this.matches_p2s[row[1]] = row[3]
      }
    };
    // Find Master gid and delete from projs b/c we iterate though projs for upsync
    master = steps.params.header.toLowerCase().concat(' - ', 'master')
    master = stringSimilarity.findBestMatch(master, Object.keys(steps.get_gids.projs)).bestMatch.target
    this.master_gid = steps.get_gids.projs[master]
    delete this.projs[master]
}