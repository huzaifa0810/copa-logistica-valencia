/* Una sola web: la portada es pública y, al iniciar sesión, la organización abre el panel en esta misma página. */
(function(){
  "use strict";
  var ADMIN=window.COPA_ADMIN_UID;var auth=firebase.auth();auth.useDeviceLanguage();
  window.COPA_SESSION={admin:false,known:false};
  var $=function(id){return document.getElementById(id);};
  var frame=null,openAfterLogin=false;
  function setHash(h){try{history.replaceState(null,"",h?"#"+h:location.pathname+location.search);}catch(e){}}
  function showLogin(msg){$("login").hidden=false;document.documentElement.classList.add("locked");$("lg-err").textContent=msg||"";$("lg-info").textContent="";setTimeout(function(){$("lg-email").focus();},50);}
  function hideLogin(){$("login").hidden=true;document.documentElement.classList.remove("locked");}
  function openPanel(){if(frame)return;frame=document.createElement("iframe");frame.id="panelFrame";frame.title="Panel de la organización";frame.src="admin.html?embed=1";
    document.body.appendChild(frame);document.documentElement.classList.add("panel-open");setHash("panel");}
  function closePanel(){if(frame){frame.remove();frame=null;}document.documentElement.classList.remove("panel-open");setHash("");if(typeof render==="function")render();}
  window.copaAcceso=function(){if(window.COPA_SESSION.admin)openPanel();else{openAfterLogin=true;showLogin();}};
  window.addEventListener("message",function(ev){if(ev.origin!==location.origin||!ev.data)return;
    if(ev.data.type==="copa:portada")closePanel();
    if(ev.data.type==="copa:logout"){closePanel();auth.signOut();}});
  auth.onAuthStateChanged(function(u){var was=window.COPA_SESSION.admin;
    if(u&&u.uid!==ADMIN){auth.signOut();showLogin("Esta cuenta no tiene acceso al panel.");return;}
    window.COPA_SESSION.admin=!!u;window.COPA_SESSION.known=true;
    if(!u&&frame)closePanel();
    if(u&&(openAfterLogin||location.hash==="#panel")){openAfterLogin=false;hideLogin();openPanel();}
    else if(!u&&location.hash==="#panel"){openAfterLogin=true;showLogin();}
    if(was!==window.COPA_SESSION.admin&&typeof render==="function")render();});
  function msgFor(e){var c=e&&e.code||"";
    if(c==="auth/invalid-credential"||c==="auth/wrong-password"||c==="auth/user-not-found"||c==="auth/invalid-email")return"Correo o contraseña incorrectos.";
    if(c==="auth/too-many-requests")return"Demasiados intentos. Espera unos minutos o restablece la contraseña.";
    if(c==="auth/network-request-failed")return"Sin conexión. Revisa internet e inténtalo de nuevo.";
    return"No se ha podido iniciar sesión. Inténtalo de nuevo.";}
  $("lg-form").addEventListener("submit",function(ev){ev.preventDefault();var err=$("lg-err"),btn=$("lg-btn");err.textContent="";$("lg-info").textContent="";
    var email=$("lg-email").value.trim(),pass=$("lg-pass").value;if(!email||!pass){err.textContent="Escribe tu correo y tu contraseña.";return;}
    btn.disabled=true;btn.textContent="Entrando…";openAfterLogin=true;
    auth.signInWithEmailAndPassword(email,pass).then(function(){$("lg-pass").value="";}).catch(function(e){err.textContent=msgFor(e);$("lg-pass").value="";$("lg-pass").focus();})
      .finally(function(){btn.disabled=false;btn.textContent="Entrar";});});
  $("lg-reset").addEventListener("click",function(){var email=$("lg-email").value.trim();var err=$("lg-err");err.textContent="";
    if(!email){err.textContent="Escribe tu correo arriba y vuelve a pulsar.";$("lg-email").focus();return;}
    auth.sendPasswordResetEmail(email).then(function(){$("lg-info").textContent="Si el correo es el de la organización, te llegará un enlace para cambiar la contraseña.";})
      .catch(function(){err.textContent="No se ha podido enviar el correo. Revisa la dirección.";});});
  $("lg-close").addEventListener("click",function(){openAfterLogin=false;hideLogin();if(location.hash==="#panel")setHash("");});
  $("login").addEventListener("keydown",function(ev){if(ev.key==="Escape")$("lg-close").click();});
})();
