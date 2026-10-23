/* Acceso al panel: inicio de sesión con Firebase Authentication.
   La protección real está en las reglas de Firestore: solo el UID de la organización puede leer o escribir los datos privados. */
(function(){
  "use strict";
  var ADMIN=window.COPA_ADMIN_UID;
  firebase.initializeApp(window.COPA_FIREBASE);
  var auth=firebase.auth(),fs=firebase.firestore();
  auth.useDeviceLanguage();
  var resolveReady;var ready=new Promise(function(r){resolveReady=r;});
  var $=function(id){return document.getElementById(id);};
  var form=$("lg-form"),err=$("lg-err"),btn=$("lg-btn"),info=$("lg-info");
  function show(msg){$("login").hidden=false;document.documentElement.classList.add("locked");err.textContent=msg||"";if(!msg)setTimeout(function(){$("lg-email").focus();},50);}
  function hide(){$("login").hidden=true;document.documentElement.classList.remove("locked");}
  function msgFor(e){var c=e&&e.code||"";
    if(c==="auth/invalid-credential"||c==="auth/wrong-password"||c==="auth/user-not-found"||c==="auth/invalid-email")return"Correo o contraseña incorrectos.";
    if(c==="auth/too-many-requests")return"Demasiados intentos. Espera unos minutos o restablece la contraseña.";
    if(c==="auth/network-request-failed")return"Sin conexión. Revisa internet e inténtalo de nuevo.";
    if(c==="auth/user-disabled")return"Esta cuenta está desactivada.";
    return"No se ha podido iniciar sesión. Inténtalo de nuevo.";}
  function addLogout(u){var box=document.querySelector(".brand .right");if(!box||document.getElementById("logoutBtn"))return;
    var b=document.createElement("button");b.id="logoutBtn";b.type="button";b.className="logout";b.textContent="Salir";b.title="Cerrar sesión ("+(u.email||"")+")";
    b.addEventListener("click",function(){auth.signOut().then(function(){location.reload();});});box.appendChild(b);}
  auth.onAuthStateChanged(function(u){
    if(u&&u.uid===ADMIN){hide();resolveReady(u);setTimeout(function(){addLogout(u);},0);}
    else if(u){auth.signOut();show("Esta cuenta no tiene acceso al panel.");}
    else show();});
  form.addEventListener("submit",function(ev){ev.preventDefault();err.textContent="";info.textContent="";
    var email=$("lg-email").value.trim(),pass=$("lg-pass").value;
    if(!email||!pass){err.textContent="Escribe tu correo y tu contraseña.";return;}
    btn.disabled=true;btn.textContent="Entrando…";
    auth.signInWithEmailAndPassword(email,pass).catch(function(e){err.textContent=msgFor(e);$("lg-pass").value="";$("lg-pass").focus();})
      .finally(function(){btn.disabled=false;btn.textContent="Entrar";});});
  $("lg-reset").addEventListener("click",function(){var email=$("lg-email").value.trim();err.textContent="";info.textContent="";
    if(!email){err.textContent="Escribe tu correo arriba y vuelve a pulsar.";$("lg-email").focus();return;}
    auth.sendPasswordResetEmail(email).then(function(){info.textContent="Si el correo es el de la organización, te llegará un enlace para cambiar la contraseña.";})
      .catch(function(e){err.textContent=e&&e.code==="auth/too-many-requests"?msgFor(e):"No se ha podido enviar el correo. Revisa la dirección.";});});
  function saveFile(x){var data=x.data;var ext=(String(x.filename).split(".").pop()||"").toLowerCase();
    var type={csv:"text/csv;charset=utf-8",json:"application/json",txt:"text/plain;charset=utf-8"}[ext]||"application/octet-stream";
    var blob=data instanceof Blob?data:new Blob([data],{type:type});
    var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=x.filename;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);return Promise.resolve({status:"saved"});}
  /* Misma interfaz que usaba la versión anterior: el resto de la aplicación no cambia. */
  window.claude={use:function(n){return ready.then(function(){
    if(n==="db")return{doc:function(p){return fs.doc(p);},collection:function(c){return fs.collection(c);}};
    if(n==="user")return{canEdit:function(){return Promise.resolve(true);},isOwner:function(){return Promise.resolve(true);}};
    if(n==="downloads")return{save:saveFile};
    return null;});}};
})();
