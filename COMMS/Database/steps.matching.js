async (event, steps) => {
    var stringSimilarity = require('string-similarity')
    projects = steps.projects_with_header.projects
    sections = steps.sections.sections
    this.array = []
    
    // Use string similarity to find the closest matches between project names and section names
    // Create an array with corresponding projects & sections on the same line
    for (proj of Object.keys(projects)){
      if (proj.includes('master')){
        match = '(no section)'
        match_gid = sections[match]
      } else if (proj.includes('meeting agenda')) {
        match = '(no section)'
        match_gid = sections[match]
      } else {
        match = stringSimilarity.findBestMatch(proj, Object.keys(sections)).bestMatch.target;
        match_gid = sections[match]
        delete sections[match];
      };
      // console.log(`${proj} matches to ${match}`);
      // console.log(sections)
      this.array.push([proj, projects[proj], match, match_gid])
    }
    delete sections['(no section)']
    for ([name, gid] of Object.entries(sections)) {
      this.array.push([ '', '',name, gid])
    }
}