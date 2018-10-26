# Docker Swarm Conformity Monkey

This is a script inspired by the goals of the [Netflix Conformity Monkey](https://medium.com/netflix-techblog/conformity-monkey-keeping-your-cloud-instances-following-best-practices-2aaff3479adc) and checks Docker service definitions for common problems and best pratices.  The script generates a report which can be used to identify possible improvements to your Docker service definitions so they follow best practices.  Some of the checks this performs are related to running Docker services on Docker Enterprise Edition version 2.0, but they will only fail if you are using features of that platform.  This should not be used to test services running on an older version of Docker Enterprise Edition.
