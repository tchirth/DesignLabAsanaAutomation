async (events, steps, auths) => {
    const axios = require('axios')
    header = steps.params.header.toLowerCase()
    projects = null;
    this.projects = {}
    // Get list of all projects that the authorizer has access to
    projects = await require("@pipedreamhq/platform").axios(this, {
      url: `https://app.asana.com/api/1.0/projects`,
      headers: {
        Authorization: `Bearer ${auths.asana.oauth_access_token}`,
      }
    })
    // create object of matching project names and gids
    if (projects.data) {
      for (project of projects.data) {
        if (project.name.toLowerCase().includes(header)) {
          this.projects[project.name.toLowerCase()] = project.gid
          if (project.name.toLowerCase().includes('master')) {
            this.master_gid = project.gid
          };
        };
      };
    };
}