const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const validatePassword = (password) => {
  return password.length > 5;
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    console.log(jwtToken);
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

const convertTweetDbObjectToResponseObject = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

const convertTweetIdDbObjectToResponseObject = (dbObject) => {
  return {
    tweet: dbObject.tweet,
    likes: dbObject.likes,
    replies: dbObject.replies,
    dateTime: dbObject.date_time,
  };
};

const getUserId = async (username) => {
  getUserIdQuery = `SELECT user_id from user WHERE
     username = '${username}'`;
  let Id = await db.get(getUserIdQuery);
  console.log(Id.user_id);
  return Id.user_id;
};

// Post Register API

app.post("/register", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (name, username, password, gender)
     VALUES
      (
       '${name}',
       '${username}',
       '${hashedPassword}',
       '${gender}'  
      );`;
    if (validatePassword(password)) {
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// Post Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Post Login API

app.post("/login/", async (request, response) => {
  const { category, email, password } = request.body;
  switch (true) {
    case category === "master":
      const selectUserQuery = `SELECT * FROM master WHERE email = '${email}'`;
      const dbUser = await db.get(selectUserQuery);
      if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
      } else {
        const isPasswordMatched = await bcrypt.compare(
          password,
          dbUser.password
        );
        if (isPasswordMatched === true) {
          const payload = {
            username: username,
          };
          const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
          response.send({ jwtToken });
        } else {
          response.status(400);
          response.send("Invalid password");
        }
      }
      break;
    case category === "admin":
      const selectUserQuery = `SELECT * FROM vendor WHERE email = '${email}'`;
      const dbUser = await db.get(selectUserQuery);
      if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
      } else {
        const isPasswordMatched = await bcrypt.compare(
          password,
          dbUser.password
        );
        if (isPasswordMatched === true) {
          const payload = {
            username: username,
          };
          const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
          response.send({ jwtToken });
        } else {
          response.status(400);
          response.send("Invalid password");
        }
      }
      break;
    case category === "vendor":
      const selectUserQuery = `SELECT * FROM vendor WHERE email = '${email}'`;
      const dbUser = await db.get(selectUserQuery);
      if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
      } else {
        const isPasswordMatched = await bcrypt.compare(
          password,
          dbUser.password
        );
        if (isPasswordMatched === true) {
          const payload = {
            username: username,
          };
          const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
          response.send({ jwtToken });
        } else {
          response.status(400);
          response.send("Invalid password");
        }
      }
      break;
  }
});

// Get Tweets API

app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  /*const getTweetsQuery = `
            SELECT
              user.username, tweet.tweet, tweet.date_time
            FROM
             tweet INNER JOIN follower ON tweet.user_id = follower.following_user_id INNER JOIN user
            WHERE
            follower.following_user_id in (select follower.following_user_id
                FROM
                follower INNER JOIN user ON user.user_id = follower.follower_id
                WHERE 
                user.username = '${username}')
             ORDER BY
             tweet.date_time
             LIMIT 4;`;*/

  const getTweetsQuery = `
            SELECT
              user.username, tweet.tweet, tweet.date_time
            FROM
             tweet INNER JOIN user ON tweet.user_id = user.user_id
            WHERE
            user.user_id in (select follower.following_user_id
                FROM
                follower INNER JOIN user ON user.user_id = follower.follower_user_id
                WHERE 
                user.username = '${username}')
             ORDER BY
             tweet.date_time
             LIMIT 4;`;
  const tweetArray = await db.all(getTweetsQuery);
  response.send(
    tweetArray.map((eachTweet) =>
      convertTweetDbObjectToResponseObject(eachTweet)
    )
  );
});

// Get Follows API

app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  const getFollowersQuery = `
      SELECT
       user.name
      FROM
       user
      WHERE
       user.user_id in (SELECT follower.following_user_id FROM follower INNER JOIN user
         ON user.user_id = follower.follower_user_id 
         WHERE
          user.username = '${username}');
    `;
  const followersArray = await db.all(getFollowersQuery);
  response.send(followersArray);
});

// Get Followers API

app.get("/user/followers/", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  let userId = getUserId(username);
  console.log(userId);
  const getFollowersQuery = `
     SELECT
       user.name
      FROM
       user
      WHERE
       user.user_id in (SELECT follower.follower_user_id FROM follower INNER JOIN user
         ON user.user_id = follower.following_user_id 
         WHERE
          user.username = '${username}');
    `;
  const followersArray = await db.all(getFollowersQuery);
  response.send(followersArray);
});

// Get Tweets API

const convertTweetIdDbObjectToId = (eachId, array1) => {
  let tempId = eachId.tweet_id;
  array1.push(tempId);
};

app.get("/tweets/:tweetId", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  const { tweetId } = request.params;

  const getTweetIdQuery = `
    SELECT tweet.tweet_id
    FROM
    tweet
    WHERE
    user_id in (SELECT follower.following_user_id
         FROM
          follower INNER JOIN user ON follower.follower_user_id = user.user_id
           WHERE
            user.username = '${username}')`;
  const tweetIdArray = await db.all(getTweetIdQuery);
  console.log(tweetIdArray);
  let array1 = [];
  tweetIdArray.map((eachId) => convertTweetIdDbObjectToId(eachId, array1));
  console.log(array1);

  if (tweetId in array1) {
    const getTweetQuery = `
      SELECT
       tweet.tweet, tweet.date_time, count(like.like_id) as likes,
       count(reply.reply_id) as replies
      FROM
       tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id INNER JOIN reply
        ON reply.tweet_id = tweet.tweet_id
      WHERE
       tweet.tweet_id = ${tweetId};
    `;
    const tweet = await db.get(getTweetQuery);
    response.send(convertTweetIdDbObjectToResponseObject(tweet));
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

// Get TweetLikes API

const convertLikedUserDbObjectToUser = (eachUser, obj) => {
  let tempUser = eachUser.username;
  obj.likes.push(tempUser);
};

app.get(
  "/tweets/:tweetId/likes",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    console.log(username);
    const { tweetId } = request.params;

    const getTweetIdQuery = `
    SELECT tweet.tweet_id
    FROM
    tweet
    WHERE
    user_id in (SELECT follower.following_user_id
         FROM
          follower INNER JOIN user ON follower.follower_user_id = user.user_id
           WHERE
            user.username = '${username}')`;
    const tweetIdArray = await db.all(getTweetIdQuery);
    console.log(tweetIdArray);
    let array1 = [];
    tweetIdArray.map((eachId) => convertTweetIdDbObjectToId(eachId, array1));
    console.log(array1);

    if (tweetId in array1) {
      const getTweetQuery = `
       SELECT user.username FROM user 
       WHERE 
       user_id in( SELECT
        like.user_id
      FROM
       tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id
      WHERE
       tweet.tweet_id = ${tweetId} )
      ;
    `;
      const usersArray = await db.all(getTweetQuery);
      let obj = { likes: [] };

      usersArray.map((eachUser) =>
        convertLikedUserDbObjectToUser(eachUser, obj)
      );

      response.send(obj);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

// Get TweetReplies API

const convertReplyUserDbObjectToUser = (eachUser, obj) => {
  obj.replies.push(eachUser);
};

app.get(
  "/tweets/:tweetId/replies",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    console.log(username);
    const { tweetId } = request.params;

    const getTweetIdQuery = `
    SELECT tweet.tweet_id
    FROM
    tweet
    WHERE
    user_id in (SELECT follower.following_user_id
         FROM
          follower INNER JOIN user ON follower.follower_user_id = user.user_id
           WHERE
            user.username = '${username}')`;
    const tweetIdArray = await db.all(getTweetIdQuery);
    console.log(tweetIdArray);
    let array1 = [];
    tweetIdArray.map((eachId) => convertTweetIdDbObjectToId(eachId, array1));
    console.log(array1);

    if (tweetId in array1) {
      const getTweetQuery = `
       SELECT user.name, reply.reply FROM user NATURAL JOIN reply
       WHERE 
       user.user_id in( SELECT
        reply.user_id
      FROM
       tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id
      WHERE
       tweet.tweet_id = ${tweetId} )
      ;
    `;
      const usersArray = await db.all(getTweetQuery);
      let obj = { replies: [] };

      usersArray.map((eachUser) =>
        convertReplyUserDbObjectToUser(eachUser, obj)
      );
      response.send(obj);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

// Get UserTweets API

app.get("/user/tweets", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);

  getUserIdQuery = `SELECT user_id from user WHERE
     username = '${username}'`;
  let Id = await db.get(getUserIdQuery);
  let userId = Id.user_id;

  const getTweetsQuery = `
      SELECT
       tweet.tweet, tweet.date_time, count(like_id) as likes,
       count(reply_id) as replies
      FROM
       tweet LEFT JOIN like ON tweet.tweet_id = like.tweet_id
        LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
       GROUP BY
        tweet.tweet_id
        HAVING
        tweet.user_id = ${userId};
    `;

  /*const getTweetsQuery = `
      SELECT
       tweet.tweet, count(reply_id) as replies
      FROM
       tweet LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
       GROUP BY
        tweet.tweet_id
        HAVING
        tweet.user_id = ${userId};`;*/

  /*const getTweetsQuery = `
      SELECT
       tweet
      FROM
       tweet
      WHERE
        user_id = ${userId};
    `;*/

  const tweetsArray = await db.all(getTweetsQuery);
  response.send(
    tweetsArray.map((eachTweet) =>
      convertTweetIdDbObjectToResponseObject(eachTweet)
    )
  );
});

// Post Tweet API

app.post("/user/tweets", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  let { username } = request;
  getUserIdQuery = `SELECT user_id from user WHERE
     username = '${username}'`;
  let Id = await db.get(getUserIdQuery);
  let userId = Id.user_id;

  const PostTweetQuery = `
  INSERT INTO tweet (tweet,user_id) VALUES ('${tweet}', ${userId})`;
  await db.run(PostTweetQuery);
  response.send("Created a Tweet");
});

// Delete Tweet API

app.delete("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  let { username } = request;

  getUserIdQuery = `SELECT user_id from user WHERE
     username = '${username}'`;
  let Id = await db.get(getUserIdQuery);
  let userId = Id.user_id;

  getUserIdQuery = `SELECT user_id from tweet WHERE
     tweet_id = ${tweetId}`;
  let tId = await db.get(getUserIdQuery);
  console.log(tId);
  let tweetUserId = tId.user_id;

  if (userId === tweetUserId) {
    const deleteTweetQuery = ` DELETE FROM tweet
       WHERE
        tweet_id = ${tweetId}`;
    await db.run(deleteTweetQuery);
    response.send("Tweet Removed");
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

// Get UserUsername API

app.get("/user/:username", async (request, response) => {
  const { username } = request.params;
  const getuserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const data = await db.get(getuserQuery);
  response.send(data);
});

// Get User Profile API

app.get("/profile/", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const userDetails = await db.get(selectUserQuery);
  response.send(userDetails);
});

module.exports = app;
