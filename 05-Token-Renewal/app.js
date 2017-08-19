$('document').ready(function() {
  var userProfile;
  var content = $('.content');
  var loadingSpinner = $('#loading');
  content.css('display', 'block');
  loadingSpinner.css('display', 'none');

  var tokenRenewalTimeout;

  var webAuth = new auth0.WebAuth({
    domain: AUTH0_DOMAIN,
    clientID: AUTH0_CLIENT_ID,
    redirectUri: AUTH0_CALLBACK_URL,
    audience: AUTH0_AUDIENCE,
    responseType: 'token id_token',
    scope: 'openid profile',
    leeway: 60
  });

  var loginStatus = $('.container h4');
  var loginView = $('#login-view');
  var homeView = $('#home-view');
  var profileView = $('#profile-view');

  // buttons and event listeners
  var loginBtn = $('#btn-login');
  var logoutBtn = $('#btn-logout');

  var homeViewBtn = $('#btn-home-view');
  var profileViewBtn = $('#btn-profile-view');

  var renewTokenBtn = $('#btn-renew-token');
  var accessTokenMessage = $('#access-token-message');
  var tokenExpiryDate = $('#token-expiry-date');

  homeViewBtn.click(function() {
    homeView.css('display', 'inline-block');
    profileView.css('display', 'none');
  });

  profileViewBtn.click(function() {
    homeView.css('display', 'none');
    profileView.css('display', 'inline-block');
    getProfile(function (err) {
      if (err) {
        return console.error(err);
      }

      displayProfile();
    });
  });

  loginBtn.click(function(e) {
    e.preventDefault();
    webAuth.authorize();
  });

  logoutBtn.click(logout);

  renewTokenBtn.click(function() {
    renewToken();
  });

  function setSession(authResult) {
    // Set the time that the access token will expire at
    var expiresAt = JSON.stringify(
      authResult.expiresIn * 1000 + new Date().getTime()
    );
    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('id_token', authResult.idToken);
    localStorage.setItem('expires_at', expiresAt);
    scheduleRenewal();
  }

  function logout() {
    // Remove tokens and expiry time from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('expires_at');
    clearTimeout(tokenRenewalTimeout);
    displayButtons();
  }

  function isAuthenticated() {
    // Check whether the current time is past the
    // access token's expiry time
    var expiresAt = JSON.parse(localStorage.getItem('expires_at'));
    return new Date().getTime() < expiresAt;
  }

  function displayButtons() {
    var loginStatus = $('.container h4');
    if (isAuthenticated()) {
      var expiresAt = JSON.parse(localStorage.getItem('expires_at'));
      loginBtn.css('display', 'none');
      logoutBtn.css('display', 'inline-block');
      profileViewBtn.css('display', 'inline-block');
      renewTokenBtn.css('display', 'inline-block');
      accessTokenMessage.css('display', 'inline-block');
      loginStatus.text(
        'You are logged in! You can now view your profile area.'
      );
      tokenExpiryDate.text(JSON.stringify(new Date(expiresAt)));
    } else {
      homeView.css('display', 'inline-block');
      loginBtn.css('display', 'inline-block');
      logoutBtn.css('display', 'none');
      profileViewBtn.css('display', 'none');
      profileView.css('display', 'none');
      renewTokenBtn.css('display', 'none');
      accessTokenMessage.css('display', 'none');
      loginStatus.text('You are not logged in! Please log in to continue.');
    }
  }

  function getProfile(cb) {
    // fetch profile if it doesn't already exist
    if (userProfile) {
      return cb();
    }

    var accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      return cb(new Error('Access token must exist to fetch profile'));
    }

    webAuth.client.userInfo(accessToken, function(err, profile) {
      if (err) return cb(err);

      if (profile) {
        userProfile = profile;
      }
      cb();
    });  
  }

  function displayProfile() {
    // display the profile
    $('#profile-view .nickname').text(userProfile.nickname);
    $('#profile-view .full-profile').text(JSON.stringify(userProfile, null, 2));
    $('#profile-view img').attr('src', userProfile.picture);
  }

  function handleAuthentication() {
    webAuth.parseHash(function(err, authResult) {
      if (authResult && authResult.accessToken && authResult.idToken) {
        window.location.hash = '';
        setSession(authResult);
        loginBtn.css('display', 'none');
        homeView.css('display', 'inline-block');
      } else if (err) {
        homeView.css('display', 'inline-block');
        console.log(err);
        alert(
          'Error: ' + err.error + '. Check the console for further details.'
        );
      }
      displayButtons();
    });
  }

  function renewToken() {
    webAuth.renewAuth(
      {
        audience: AUTH0_AUDIENCE,
        redirectUri: AUTH0_SILENT_AUTH_REDIRECT,
        usePostMessage: true
      },
      function(err, result) {
        if (err) {
          alert(
            'Could not get a new token using silent authentication. ' +
              err.description
          );
        } else {
          setSession(result);
          alert('Successfully renewed auth!');
        }
      }
    );
  }

  function scheduleRenewal() {
    var expiresAt = JSON.parse(localStorage.getItem('expires_at'));
    var delay = expiresAt - Date.now();
    if (delay > 0) {
      tokenRenewalTimeout = setTimeout(function() {
        renewToken();
      }, delay);
    }
  }

  handleAuthentication();
  scheduleRenewal();
});
