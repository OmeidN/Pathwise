# Credentials Folder

## The purpose of this folder is to store all credentials needed to log into your server and databases. This is important for many reasons. But the two most important reasons is
    1. Grading , servers and databases will be logged into to check code and functionality of application. Not changes will be unless directed and coordinated with the team.
    2. Help. If a class TA or class CTO needs to help a team with an issue, this folder will help facilitate this giving the TA or CTO all needed info AND instructions for logging into your team's server. 


# Below is a list of items required. Missing items will causes points to be deducted from multiple milestone submissions.

1. Server URL or IP: 3.135.184.72
2. SSH username: ubuntu
3. SSH password or key: Use the key file in this folder: csc648-team-key.pem
4. Database URL or IP and port used: 127.0.0.1:3306
5. Database username (app): csc648_user | (CTO, full privileges): cto
6. Database password (app): sfsu648! | (CTO): ctoTeam2
7. Database name: csc648_db
8. Instructions on how to use the above information. (See "How to use" section below.)

---

## How to use

### SSH into the server
1. Clone this repo (or ensure you have the credentials folder):

https://github.com/CSC-648-SFSU/CSC-648-848-S02-Spring2026-Team02.git

2. From a terminal, run (replace PATH with the path to this repo's credentials folder):

ssh -i PATH/csc648-team-key.pem ubuntu@3.135.184.72

Example (Windows, from repo root): `ssh -i credentials/csc648-team-key.pem ubuntu@3.135.184.72`

3. You are now on the EC2 server. The ubuntu user has sudo (root) access.

### Connect to MySQL (from the server)
- **App user:** `mysql -u csc648_user -p`  
  Password: sfsu648!  
  Then: `USE csc648_db;`
- **CTO user (full privileges):** `mysql -u cto -p`  
  Password: ctoTeam2

### Connect to MySQL from your laptop (SSH tunnel)
1. Open a tunnel (replace PATH with path to credentials folder):

ssh -i PATH/csc648-team-key.pem -L 3306:127.0.0.1:3306 ubuntu@3.135.184.72

2. In another terminal or a MySQL client, connect to host 127.0.0.1, port 3306, user csc648_user (or cto) with the password above.

---

# Most important things to Remember
## These values need to kept update to date throughout the semester. <br>
## <strong>Failure to do so will result it points be deducted from milestone submissions.</strong><br>
## You may store the most of the above in this README.md file. DO NOT Store the SSH key or any keys in this README.md file.
