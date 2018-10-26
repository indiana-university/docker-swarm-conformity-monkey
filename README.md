# Docker Swarm Conformity Monkey

This is a script inspired by the goals of the [Netflix Conformity Monkey](https://medium.com/netflix-techblog/conformity-monkey-keeping-your-cloud-instances-following-best-practices-2aaff3479adc) and checks Docker service definitions for common problems and best pratices.  The script generates a report which can be used to identify possible improvements to your Docker service definitions so they follow best practices.  Some of the checks this performs are related to running Docker services on Docker Enterprise Edition version 2.0, but they will only fail if you are using features of that platform.  This should not be used to test services running on an older version of Docker Enterprise Edition.

## Checks

The following describes the checks that are performed by this script.  The summaries below indicate why a check might fail and how to correct the issue.

* **CPU Limit**: This check will fail if there is no CPU limit placed on the service definition.  In a shared Docker environment it is a best practice to set a CPU limit for each service to avoid resource starvation on the servers which can be caused by misbehaving services.  See the [Resources section](https://docs.docker.com/compose/compose-file/#resources) of the Docker Compose file reference for more details on how to set this for your service.
* **Memory Limit**: This check will fail if there is no memory limit placed on the service definition.  In a shared Docker environment it is a best practice to set a memory limit for each service to avoid resource starvation on the servers which can be caused by misbehaving services.  See the [Resources section](https://docs.docker.com/compose/compose-file/#resources) of the Docker Compose file reference for more details on how to set this for your service.
* **HTTP Routing Mesh Labels**: This check will fail if you are using any legacy [HTTP Routing Mesh (HRM)](https://success.docker.com/article/ucp-2-0-service-discovery) labels on your services.  The HRM was used in the Docker Universal Control Plane (UCP) version 2 which we are no longer using.  If you have these labels on your service we have found that the UCP may not correctly orchestrate service updates so it is best to update these labels to their new equivalents.  See the [Interlock documentation](https://docs.docker.com/ee/ucp/interlock/) for more details of how to configure this for your services.
* **HTTP Routing Mesh Network**: This check will fail if your service is attached to any [HTTP Routing Mesh (HRM)](https://success.docker.com/article/ucp-2-0-service-discovery) network.  The previous routing architecture in the Docker Universal Control Plane (UCP) version 2 required you to attach your services to a shared network which the HRM was configured to use for routing traffic to your services.  The replacement, Interlock, handles this differently and allows you to specify the network to use for routing traffic to the service which allows for better network segmentation.  To fix this error you will need to remove your services from any networks which have a `com.docker.ucp.mesh.http` label. Typically these networks have "hrm" in their name as well.  See the the [Interlock documentation](https://docs.docker.com/ee/ucp/interlock/) for details of how to use your own network for Interlock routing and the [network configuration](https://docs.docker.com/compose/compose-file/#network-configuration-reference) and the [service networking configuration](https://docs.docker.com/compose/compose-file/#networks) in the Compose file reference for more information.
* **Interlock Network Label**: This check will fail if you are using Interlock for routing traffic to a service and there is an issue with the Interlock network label (`com.docker.lb.network`).  There are two checks that are performed:
  
  * The label exists, but it does not point to a valid network.  The fix for this would be to update the Interlock network label to use the network ID or the correct name of the network you want to route traffic through.
  * The label does not exist and the service is attached to multiple networks.  This confuses Interlock since it is not sure which service to route traffic through.  The fix for this issue is to supply an Interlock network label which points to the network Interlock should use for routing traffic.  See the [Interlock service label reference](https://docs.docker.com/ee/ucp/interlock/usage/labels-reference/) for more details.

* **Interlock Update Delay**: This check will issue a warning if you are using Interlock for routing traffic and do not specify a delay in your service update configuration.  If there is no delay between updating replicas of your service there may be a short period where Interlock's configuration file does not include the correct IP address for your containers so it may be unable to route traffic appropriately.  The delay gives Interlock some time to update its configuration file after each replica is updated to ensure it is in a good state before moving on.  To fix this warning you must specify a delay of `10s` in your update configuration.  See the [update config](https://docs.docker.com/compose/compose-file/#update_config) documentation in the Compose file reference for more details.
* **Restart Policy Max Attempts**: This check will issue a warning if you specify a restart policy on the service which has a `max_attempts` with no `window`.  If you set a `max_attempts` on your restart policy it will only allow the replica for a service to restart that many times before it will stop trying to restart it.  If you do not also configure a `window` alongside this Swarm will look at any exited replicas when determining if it has restarted too many times, even if those replicas exited days or weeks before.  The `window` configuration will ensure that the replica has restarted too many times in a fixed window so the `max_attempts` will work as intended.  To remove this warning make sure you always specify a `window` in your restart policy if you use `max_attempts`.  See the [restart policy configuration](https://docs.docker.com/compose/compose-file/#restart_policy) for more details.
* **Restart Policy Delay**: This check will issue a warning if you are not using `max_attempts` in your service's restart policy and have not configured a `delay`.  Services without a restart delay that are having issues starting will constantly spawn new replicas as they error out which can put strain on the swarm's managers and routing layers.  Adding a delay gives a bit more breathing room since the service will not thrash while it is having an issue.  There are two ways to fix this warning.  You can add a [restart policy delay configuration](https://docs.docker.com/compose/compose-file/#restart_policy) or you can add a `max_attempts` configuration which will put an upper bound on the number of times the service will be restarted if there are issues.  See the information on the `Restart Policy Max Attempts` if you go with `max_attempts` since it documents some gotchas with that approach.

## Running the script

The simplest way to use this command is to run it as a Docker container:

```sh
docker container run -t --rm registry.docker.iu.edu/esimw/docker-swarm-conformity-monkey
```

There are a few flags set there.  The `-t` flag allocates a pseudo-tty which will allow the colored text to come through and can be removed when running this in CI.  The `--rm` flag will cause this container to be removed when the command exits and could be removed if you want to retain the container to view its logs afterwards.

When the script is executed it takes an optional argument which is the name of a single service to check.  If no arguments are provided it will instead check every service it can find.  By default it will only log a summary of each service along with details of the checks that have warnings or failures.  The verbose option (`-v` or `--verbose`) may be provided and the script will log details about each check that succeeds for each service.  The quiet option (`--quiet`) will only log information for services that have failures.  If there are any errors it will exit with an exit code of "1" so the script can be used to fail a build plan.  More help can be found by running the "help" command:

```sh
docker container run -t --rm registry.docker.iu.edu/esimw/docker-swarm-conformity-monkey help
```

### Connecting to the Docker Engine

This Docker container will requires you to provide a connection to a Docker engine for it to work appropriately.  To do this on your local machine you would simply provide a handle to the Docker socket to the container like so:

```
docker container run -t --rm -v /var/run/docker.sock:/var/run/docker.sock registry.docker.iu.edu/esimw/docker-swarm-conformity-monkey
```

If you wish to orchestrate checking services on a remote Docker engine you will need to provide `DOCKER_HOST` and `DOCKER_CERT_PATH` environment variables.  The `DOCKER_HOST` environment variable points to the URL for the remote Docker engine (e.g. `tcp://ucp-test.docker.iu.edu:443`) and the `DOCKER_CERT_PATH` environment variable points to a mounted directory containing SSL certificate used for authentication.  For deploying to the Universal Control Plane (UCP) the `DOCKER_CERT_PATH` would point to your UCP client bundle.  For example:

```
docker run -t --rm -v /path/to/ucp-bundle:/ucp -e DOCKER_CERT_PATH=/ucp -e DOCKER_HOST=tcp://ucp-test.docker.iu.edu:443 registry.docker.iu.edu/esimw/docker-swarm-conformity-monkey
```
