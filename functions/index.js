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

/////////////////////////
//   USER API ROUTES   //
/////////////////////////

api.get(['/api/v1/users/:id', '/api/v1/users/:id/'], (req, res) => {
  const secret = req.headers.key;
  if (secret === '') {
    return res.status(404).send({
      error: 'no_token',
      message: 'Please provide an access token.',
    });
  }
  let testAuthentication = client.query(
    q.Let(
      {
        user: q.Get(q.Match(q.Index('user_by_id'), req.params.id)),
        userRef: q.Select('ref', q.Var('user')),
        // siteRef: q.Ref(
        //   q.Collection('sites'),
        //   q.Select(['ref', 'id'], q.Var('site')),
        // ),
        // userRef: q.Ref(q.Collection('users'), q.Var('user')),
        identityRef: q.Identity(),
      },
      {
        isAllowed: q.Equals(q.Var('userRef'), q.Var('identityRef')),
      },
    ),
    { secret },
  );

  let getUser = client.query(
    q.Get(q.Match(q.Index('user_by_id'), req.params.id)),
    { secret },
  );

  testAuthentication
    .then((response) => {
      if (response.isAllowed) {
        getUser
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
            "You don't have permission to access this user. If this is a mistake, please contact jarod@staticbox.io",
        });
      }
    })
    .catch((error) => {
      if (error.name === 'PermissionDenied') {
        return res.status(403).send({
          error: 'permission_denied',
          message:
            "You don't have permission to access this user. If this is a mistake, please contact jarod@staticbox.io",
          data: error,
        });
      } else if (error.name === 'NotFound') {
        return res.status(404).send({
          error: 'not_found',
          message: `No user exists with the id ${req.params.id}.`,
        });
      } else if (error.name === 'Unauthorized') {
        return res.status(404).send({
          error: 'unauthorized',
          message: `The token you provided is invalid.`,
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

api.put(['/api/v1/users/:id', '/api/v1/users/:id/'], (req, res) => {
  const secret = req.headers.key;
  if (secret === '') {
    return res.status(404).send({
      error: 'no_token',
      message: 'Please provide an access token.',
    });
  }
  const body = req.body;
  const data = body;

  // let testAuthentication = client.query(
  //   q.Let(
  //     {
  //       user: q.Get(q.Match(q.Index('user_by_id'), req.params.id)),
  //       userRef: q.Ref(
  //         q.Collection('users'),
  //         q.Select(['ref', 'id'], q.Var('user')),
  //       ),
  //       // userRef: q.Ref(q.Collection('users'), q.Var('user')),
  //       identityRef: q.Identity(),
  //     },
  //     {
  //       isAllowed: q.Or(
  //         q.Equals(q.Var('userRef'), q.Var('identityRef'))
  //       ),
  //     },
  //   ),
  //   { secret },
  // );

  let updateUser = client.query(
    q.Let(
      {
        user: q.Get(q.Match(q.Index('user_by_id'), req.params.id)),
      },
      q.Update(q.Select('ref', q.Var('user')), {
        data,
      }),
    ),

    { secret },
  );

  // testAuthentication
  //   .then((response) => {
  //     if (response.isAllowed) {
  updateUser
    .then((responseTwo) => {
      return res.status(200).send(responseTwo);
    })
    // .catch((errorTwo) => {
    //   return res.status(300).send(errorTwo);
    // });
    //   } else {
    //     return res.status(403).send({
    //       error: 'permission_denied',
    //       message:
    //         "You don't have permission to access this site. If this is a mistake, please contact jarod@staticbox.io",
    //     });
    //   }
    // })
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
      } else if (error.name === 'Unauthorized') {
        return res.status(404).send({
          error: 'unauthorized',
          message: `The token you provided is invalid.`,
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

/////////////////////////
//   SITE API ROUTES   //
/////////////////////////

api.get(['/api/v1/sites', '/api/v1/sites/'], (req, res) => {
  const secret = req.headers.key;
  if (secret === '') {
    return res.status(404).send({
      error: 'no_token',
      message: 'Please provide an access token.',
    });
  }
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
      } else if (error.name === 'Unauthorized') {
        return res.status(404).send({
          error: 'unauthorized',
          message: `The token you provided is invalid.`,
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
  const secret = req.headers.key;
  if (secret === '') {
    return res.status(404).send({
      error: 'no_token',
      message: 'Please provide an access token.',
    });
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
      } else if (error.name === 'Unauthorized') {
        return res.status(404).send({
          error: 'unauthorized',
          message: `The token you provided is invalid.`,
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
  const secret = req.headers.key;
  if (secret === '') {
    return res.status(404).send({
      error: 'no_token',
      message: 'Please provide an access token.',
    });
  }
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
      } else if (error.name === 'Unauthorized') {
        return res.status(404).send({
          error: 'unauthorized',
          message: `The token you provided is invalid.`,
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
  const secret = req.headers.key;
  if (secret === '') {
    return res.status(404).send({
      error: 'no_token',
      message: 'Please provide an access token.',
    });
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
      } else if (error.name === 'Unauthorized') {
        return res.status(404).send({
          error: 'unauthorized',
          message: `The token you provided is invalid.`,
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

// Export API function
exports.api = functions.https.onRequest(api);
