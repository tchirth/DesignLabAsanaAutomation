This script is intended as a quick fix to an issue we had recently (May 2021) where without our input, a webhook with Asana desynced and was automatically deleted.
The issue seemed to be entirely on Asana's side as no code was changed on ours, so the easiest fix was just to re-establish the webhook.

When this occurs, simply edit the file to create the intended webhook and record all information to update the webhook database. 

**Remember to remove the deleted webhook from the database.**
