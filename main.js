let saml2 = require('saml2-js');
let fs = require('fs');
let express = require('express');
let app = express();

// Create service provider
let sp_options = {
  entity_id: "https://localhost/metadata.xml",
  private_key: fs.readFileSync("sp/sp.key.pem").toString(),
  certificate: fs.readFileSync("sp/sp.crt").toString(),
  assert_endpoint: "https://localhost/assert"
};
let sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
let idp_options = {
  sso_login_url: "https://localhost/login",
  sso_logout_url: "https://localhost/logout",
  certificates: [fs.readFileSync("idp/idp.crt").toString()]
};
let idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata.xml", function(req, res) {
  console.info("/metadata.xml");
  res.type('application/xml');
  res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function(req, res) {
  console.info("/login");
  sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err !== null)
      return res.send(500);
    res.redirect(login_url);
  });
});

// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
  console.info("/assert");
  let options = {request_body: req.body};
  sp.post_assert(idp, options, function(err, saml_response) {
    if (err !== null)
      return res.send(500);

    // Save name_id and session_index for logout
    // Note:  In practice these should be saved in the user session, not globally.
    name_id = saml_response.user.name_id;
    session_index = saml_response.user.session_index;

    res.send("Hello #{saml_response.user.name_id}!");
  });
});

// Starting point for logout
app.get("/logout", function(req, res) {
  console.info("/logout");
  let options = {
    name_id: name_id,
    session_index: session_index
  };

  sp.create_logout_request_url(idp, options, function(err, logout_url) {
    if (err !== null)
      return res.send(500);
    res.redirect(logout_url);
  });
});

app.listen(443);