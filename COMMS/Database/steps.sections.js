async (event, steps, params, auths) => {
    const axios = require('axios')

    // Get list of sections for master project
    sections = null;
    matches = [];
    project_gid = params.project_gid
    const asanaParams = ["opt_pretty", "opt_fields"]
    const {opt_pretty, opt_fields} = params
    p = params
    const queryString = asanaParams.filter(param => p[param]).map(param => `${param}=${p[param]}`).join("&")
    sections = await require("@pipedreamhq/platform").axios(this, {
      url: `https://app.asana.com/api/1.0/projects/${project_gid}/sections?${queryString}`,
      headers: {
        Authorization: `Bearer ${auths.asana.oauth_access_token}`,
      }
    })
    // create object of matching section names and gids
    this.sections = {}
    if (sections) {
      for (section of sections.data) {
        this.sections[section.name.toLowerCase()] = section.gid
      }
    }
}