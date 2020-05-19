// Firebase requires
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Fauna Requires
const faunadb = require('faunadb');

// Server requires
const express = require('express');
const cors = require('cors');

// Firebase setup
admin.initializeApp(functions.config().firebase);

// Fauna setup
const q = faunadb.query;

const client = new faunadb.Client({
  secret: '',
});

// CORS setup
const api = express();
api.use(cors());

// Test API method
api.get(['/api/v1', '/api/v1/'], (req, res) => {
  res
    .status(200)
    .send(`<img src="https://media.giphy.com/media/hhkflHMiOKqI/source.gif">`);
});

api.get(['/api/v1/sites', '/api/v1/sites/'], (req, res) => {
  console.log(req.headers);
  const secret = req.headers.key;

  // let testAuthentication = client.query(
  //   q.Let(
  //     {
  //       site: q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
  //       userRef: q.Select(['data', 'user'], q.Var('site')),
  //       siteRef: q.Ref(q.Collection('sites'), q.Select(['ref', 'id'], q.Var('site'))),
  //       // userRef: q.Ref(q.Collection('users'), q.Var('user')),
  //       identityRef: q.Identity(),
  //     },
  //     {
  //       isAllowed: q.Or(
  //         q.Equals(q.Var('userRef'), q.Var('identityRef')),
  //         q.Equals(q.Var('siteRef'), q.Var('identityRef')),
  //       ),
  //     },
  //   ),
  //   { secret },
  // );

  let getSites = client.query(
    q.Map(
      q.Paginate(q.Match(q.Index('all_sites'))),
      q.Lambda(
        'sitesRef',
        q.Let(
          {
            sites: q.Get(q.Var('sitesRef')),
            user: q.Get(q.Select(['data', 'user'], q.Var('sites'))),
          },
          {
            user: q.Select(['ref'], q.Var('user')),
            site: q.Var('sites'),
          },
        ),
      ),
    ),
    { secret },
  );

  getSites
    .then((responseTwo) => {
      return res.status(200).send(responseTwo);
    })
    .catch((error) => {
      if (error.name === 'PermissionDenied') {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      } else if (error.name === 'NotFound') {
        return res.status(404).send({
          error: 'not_found',
          message: `No site exists with the id ${req.params.id}.`,
        });
      } else {
        return res.status(500).send({
          error: 'server_error',
          data: error,
          message: `We encountered an unidentified error.`,
        });
      }
    });
});

api.get(['/api/v1/sites/:id', '/api/v1/sites/:id/'], (req, res) => {
  console.log(req.headers);
  const secret = req.headers.key;

  let testAuthentication = client.query(
    q.Let(
      {
        site: q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
        userRef: q.Select(['data', 'user'], q.Var('site')),
        siteRef: q.Ref(
          q.Collection('sites'),
          q.Select(['ref', 'id'], q.Var('site')),
        ),
        // userRef: q.Ref(q.Collection('users'), q.Var('user')),
        identityRef: q.Identity(),
      },
      {
        isAllowed: q.Or(
          q.Equals(q.Var('userRef'), q.Var('identityRef')),
          q.Equals(q.Var('siteRef'), q.Var('identityRef')),
        ),
      },
    ),
    { secret },
  );

  let getSite = client.query(
    q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
    { secret },
  );

  testAuthentication
    .then((response) => {
      if (response.isAllowed) {
        getSite
          .then((responseTwo) => {
            return res.status(200).send(responseTwo);
          })
          .catch((errorTwo) => {
            return res.status(300).send(errorTwo);
          });
      } else {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      }
    })
    .catch((error) => {
      if (error.name === 'PermissionDenied') {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      } else if (error.name === 'NotFound') {
        return res.status(404).send({
          error: 'not_found',
          message: `No site exists with the id ${req.params.id}.`,
        });
      } else {
        return res.status(500).send({
          error: 'server_error',
          data: error,
          message: `We encountered an unidentified error.`,
        });
      }
    });
});

api.put(['/api/v1/sites/:id', '/api/v1/sites/:id/'], (req, res) => {
  console.log(req.headers);
  const secret = req.headers.key;
  const body = req.body;
  const data = body;

  if (data.name) {
    data.id = data.name
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/\'/g, '')
      .replace(/\,/g, '-');
  }

  let testAuthentication = client.query(
    q.Let(
      {
        site: q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
        userRef: q.Select(['data', 'user'], q.Var('site')),
        siteRef: q.Ref(
          q.Collection('sites'),
          q.Select(['ref', 'id'], q.Var('site')),
        ),
        // userRef: q.Ref(q.Collection('users'), q.Var('user')),
        identityRef: q.Identity(),
      },
      {
        isAllowed: q.Or(
          q.Equals(q.Var('userRef'), q.Var('identityRef')),
          q.Equals(q.Var('siteRef'), q.Var('identityRef')),
        ),
      },
    ),
    { secret },
  );

  let updateSite = client.query(
    q.Let(
      {
        site: q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
      },
      q.Update(q.Select('ref', q.Var('site')), {
        credentials: {
          password: data.name
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/\'/g, '')
            .replace(/\,/g, '-'),
        },
        data,
      }),
    ),

    { secret },
  );

  testAuthentication
    .then((response) => {
      if (response.isAllowed) {
        updateSite
          .then((responseTwo) => {
            return res.status(200).send(responseTwo);
          })
          .catch((errorTwo) => {
            return res.status(300).send(errorTwo);
          });
      } else {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      }
    })
    .catch((error) => {
      if (error.name === 'PermissionDenied') {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      } else if (error.name === 'NotFound') {
        return res.status(404).send({
          error: 'not_found',
          message: `No site exists with the id ${req.params.id}.`,
        });
      } else {
        return res.status(500).send({
          error: 'server_error',
          data: error,
          message: `We encountered an unidentified error.`,
        });
      }
    });
});

api.delete(['/api/v1/sites/:id', '/api/v1/sites/:id/'], (req, res) => {
  console.log(req.headers);
  const secret = req.headers.key;

  let testAuthentication = client.query(
    q.Let(
      {
        site: q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
        userRef: q.Select(['data', 'user'], q.Var('site')),
        siteRef: q.Ref(
          q.Collection('sites'),
          q.Select(['ref', 'id'], q.Var('site')),
        ),
        // userRef: q.Ref(q.Collection('users'), q.Var('user')),
        identityRef: q.Identity(),
      },
      {
        isAllowed: q.Or(
          q.Equals(q.Var('userRef'), q.Var('identityRef')),
          q.Equals(q.Var('siteRef'), q.Var('identityRef')),
        ),
      },
    ),
    { secret },
  );

  let deleteSite = client.query(
    q.Let(
      {
        site: q.Get(q.Match(q.Index('site_by_id'), req.params.id)),
      },
      q.Delete(q.Select('ref', q.Var('site'))),
    ),

    { secret },
  );

  testAuthentication
    .then((response) => {
      if (response.isAllowed) {
        deleteSite
          .then((responseTwo) => {
            return res.status(200).send(responseTwo);
          })
          .catch((errorTwo) => {
            return res.status(300).send(errorTwo);
          });
      } else {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      }
    })
    .catch((error) => {
      if (error.name === 'PermissionDenied') {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
        });
      } else if (error.name === 'NotFound') {
        return res.status(404).send({
          error: 'not_found',
          message: `No site exists with the id ${req.params.id}.`,
        });
      } else {
        return res.status(500).send({
          error: 'server_error',
          data: error,
          message: `We encountered an unidentified error.`,
        });
      }
    });
});

// Get API keys
api.get(['/api/v1/comments', '/api/v1/comments/'], (req, res) => {
  console.log(req.headers.authorization);
  let testAuthentication = client.query(
    q.Map(
      q.Paginate(q.Match(q.Index('all_comments')), { size: 10000 }),
      q.Lambda(
        'commentsRef',
        q.Let(
          {
            comments: q.Get(q.Var('commentsRef')),
          },
          {
            ref: q.Select(['ref'], q.Var('comments')),
            data: q.Select(['data'], q.Var('comments')),
          },
        ),
      ),
    ),
    { secret: req.headers.authorization.split(' ')[1] },
  );

  getKeys
    .then((result) => {
      console.log(result);
      res.status(200).send(result);
      return;
    })
    .catch((error) => {
      // res.send(error);
      console.log(error);
      res.send(error);
    });
});

// Export API function
exports.api = functions.https.onRequest(api);
