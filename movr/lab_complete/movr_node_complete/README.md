# Project Overview

This is the NodeJS backend implementation of the MOVR Sample App built using TypeORM init with Express. This sample will demonstrate how to integrate a Node/TypeORM implementation with CockroachDB to create an API and utilize it with static front end built in React using create-react-app and Redux.


### Load CockroachDB
1. Connect to the database
    If you are using a local install of CockroachDB, you will first need to make sure it is running by going to the CockroachDB install directory and running the following command:

    ~~~shell
    ./cockroach start-single-node --insecure --listen-addr=localhost:26257 --http-addr=localhost:8080
    ~~~

    (This step is not required if you are using a remote database)

    You can also connect to a to a [CockroachCloud](https://cockroachlabs.cloud/) cluster if you want to use a remote database.
    Create a folder named `ssl` and put your ssl certificate in it.

2. Configure environment variables.
    You'll need to create an .env file with your host, port, username, password, port and ssl certificate path similar to the .env-example file 

3. Initialize the database

    You can do this with

    ~~~ shell
    cat dbinit.sql | cockroach sql --url <db_url>
    cockroach sql -- url <db_url>
    CREATE USER IF NOT EXISTS maxroach;
    GRANT ALL ON DATABASE movr TO maxroach;     
    GRANT ALL ON TABLE movr.* TO maxroach;
    ~~~

    The "<db_url>" can be any CockroachDB or Cockroach Cloud instance.
    
### Application setup
1. To run the application you must have node and typescript installed. First download the latest node version: 
    ~~~ shell
    https://nodejs.org/en/download/
    ~~~
    After node is downloaded you can use npm to download typescript. Run this in your command line:

    ~~~shell
    npm install -g typescript
    ~~~

2. Install dependencies by navigating to this project and running this install script in the command line
    ~~~ shell
    npm install
    ~~~

3. Start up the application by running this start script in the command line
    ~~~ shell
    npm start
    ~~~
4. Navigate to the url provided (defaults to [http://localhost:8080](http://localhost:8080)) to use the application.
    If you are using a local instance of CockroachDB you will need to make sure your PORT variable is not 8080.

### Clean up

1. To shut down the application, `Ctrl+C` out of the node process.

### Internal Instructions
These instructions are for development purposes and does not need to be included as part of the final product.

### 1. Copy Frontend To API Backend
You will need to update the package.json file in the react-frontend with the proxy url that you will be running your api on. For example:
 ~~~shell
 "proxy":"http://localhost:8080"
 ~~~
Once it is installed, you can run copy-frontend.sh located in the scripts folder to compile the React code and copy it to the static web content folder in the project. You may need to make a copy of .env-example and name it .env before running the script.

~~~shell
    sh scripts/copy-frontend.sh
~~~

### 2. Create Deployment Package for AWS Elastic Beanstalk
Once you have run the copy-frontend.sh script, run create-source-zip.sh located in the scripts folder to create a zip to deploy that includes the front end

~~~shell
    sh scripts/create-source-zip.sh
~~~

Note: Make sure you update the proxy in the react-frontend package json to your deployed url before running the copy-frontend.sh script

When you deploy the zip file to AWS, the front-end will be deployed as well.
