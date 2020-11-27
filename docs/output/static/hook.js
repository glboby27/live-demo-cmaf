(function(){
    var tt = null;
    window.top.document.getElementById("kids").innerHTML = "";
    window.onload = function(){
        
        var video = document.getElementsByTagName("video")[0];
        if(tt == null){
            tt = video.addTextTrack('subtitles');
            tt.mode = 'showing';
            var cue = new VTTCue(video.currentTime, 15, "<c.kid><u>Overlay displaying active KIDs, parsed from init-segments</u></c>");
            cue.line = 0;
            cue.align = "right";
            tt.addCue(cue);
        }
        video.addEventListener('encrypted', function(args){
            var box = mp4lib.deserialize(new Uint8Array(args.initData));
            var kids = [];
            box.boxes.forEach((b) => {
                if('KIDS' in b)
                    kids = kids.concat(b.KIDS);
            });
                
            var i = kids.length;
            var document = window.top.document;
            var kids_el = document.getElementById("kids");
            while(i-->0){
                var kid_hex = new Uint8Array(kids[i]).reduce(function(memo, i) {
                        return memo + ('0' + i.toString(16).toUpperCase()).slice(-2); //padd with leading 0 if <16
                    }, '');
                var kid_li_id = "kid_"+ kid_hex;
                if(document.getElementById(kid_li_id) == null){
                    var li = document.createElement("li");
                    li.addEventListener("webkitAnimationEnd", function(e){
                        e.target.className = "";
                    });
                    li.id = kid_li_id;
                    li.innerHTML = kid_hex.substr(0, 8) + "-" + kid_hex.substr(8, 4) + "-" + kid_hex.substr(12, 4) + "-" + kid_hex.substr(16, 4) + "-" + kid_hex.substr(20) ;
                    kids_el.appendChild(li);
                    
                    if(late[kid_hex] == true){
                        delete late[kid_hex];
                        li.className = "kid_anim";
                    }
                }
            }
        });
    }
    
    var late = {};
    //Hook EME
    URL.createObjectURL = (function(func){
        return function(){
            if(arguments[0].constructor.name == "MediaSource"){
                //hook addSourceBuffer
                var mediasource = arguments[0];
                mediasource.addSourceBuffer = (function(func){
                    return function(){
                        var addedSourceBuffer = func.apply(this, arguments);
                        var memetype = arguments[0];
                        //hook appendBuffer of added sourcebuffer
                        addedSourceBuffer.appendBuffer = (function(func){
                            return function(){

                                var buffer = arguments[0];
                                //console.log('appendBuffer:', buffer['response-url']);
                                try{
                                    var cueline = "";
                                    var test = mp4lib.deserialize(new Uint8Array(buffer));
                                    var tenc = test.findBoxByType("tenc");
                                    if(tenc){
                                        console.log(memetype, tenc);
                                        var kid_hex = new Uint8Array(tenc.default_KID).reduce(function(memo, i) {
                                            return memo + ('0' + i.toString(16).toUpperCase()).slice(-2); //padd with leading 0 if <16
                                        }, '');
                                        var kid_clean = kid_hex.substr(0, 8) + "-" + kid_hex.substr(8, 4) + "-" + kid_hex.substr(12, 4) + "-" + kid_hex.substr(16, 4) + "-" + kid_hex.substr(20)
                                        var cueline = " " + memetype + "\n\t\u21b3 KID Signaled: <b>" + kid_clean +"</b>";
                                        
                                        var document = window.top.document;
                                        var kid_el = document.getElementById("kid_" + kid_hex);
                                        if(kid_el)
                                            kid_el.className = "kid_anim";
                                        else
                                            late[kid_hex] = true;
                                    }

                                    var btrt = test.findBoxByType("btrt");
                                    if(btrt){
                                        cueline = " <u><b>" + Math.floor(btrt.avgBitrate/100000) + "00k</b></u>" + "\n" + cueline;
                                        console.log(btrt);
                                    }
                                    
                                    if(cueline.length > 0){
                                        var cue = new VTTCue(video.currentTime, video.currentTime + 10, "<c.kid>" + cueline + "</c>");
                                        cue.addEventListener("exit", function(){ 
                                            tt.removeCue(cue);    
                                        });

                                        cue.line = 2;
                                        cue.align = "left";
                                        tt.addCue(cue);
                                        tt.mode = 'showing';
                                    }
                                    
                                }catch(e){ console.log(e); };
                                func.apply(this, arguments); 
                            };
                        })(addedSourceBuffer.appendBuffer);

                        return addedSourceBuffer;
                    }
                })(mediasource.addSourceBuffer);

            }
            return func.apply(this, arguments);
        }
    })(URL.createObjectURL);


    XMLHttpRequest.prototype.open = (function(func){
        return function(){
            var url = arguments[1];
            this.addEventListener("load", function(e){
                this.response['response-url'] = url;
            });
            
            return func.apply(this, arguments);
        }
    })(XMLHttpRequest.prototype.open);
//player.getBitrateInfoListFor('video')
//player.setQualityFor('video', 1506000);


    /*
    player = dashjs.MediaPlayer().create();
    var protectionController = player.getProtectionController();
    player.initialize();
    player.setSegmentOverlapToleranceTime(2);
    player.attachView(video);
    var controlbar = new ControlBar(player); 
    controlbar.initialize();
    controlbar.reset();
    
    player.setProtectionData(
    {  
        "com.widevine.alpha":       
        {   
            "serverURL": "https://widevine-proxy.appspot.com/proxy" },
            "com.microsoft.playready":  { "serverURL": "https://playready.directtaps.net/pr/svc/rightsmanager.asmx?PlayRight=1&UseSimpleNonPersistentLicense=1"
        }
    });
    */

    //player.setCurrentTrack(player.getTracksFor('video')[0])

    /*
    var sessionToken = null;
    // Listen for 'keySystemAccessComplete' event to check if KeySystem is available
    player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_ACCESS_COMPLETE, function (e) {
        if (e.error) {
            console.error('[DASHJS-PROTECTION-PLUGIN] KEY_SYSTEM_ACCESS_COMPLETE: ', e);
        }
    });
    // Listen for 'keySessionCreated' event to get session token
    player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, function (e) {
        if (e.error) {
            console.error('[DASHJS-PROTECTION-PLUGIN] KEY_SESSION_CREATED: ', e);
        } else {
            console.log('[DASHJS-PROTECTION-PLUGIN] KEY_SESSION_CREATED: ', e);
            sessionToken = e.data;
        }
    });
    // Listen for 'licenseRequestComplete' to check for licenser request/response error
    player.on(dashjs.MediaPlayer.events.LICENSE_REQUEST_COMPLETE, function (e) {
        if (e.error) {
            console.error('[DASHJS-PROTECTION-PLUGIN] LICENSE_REQUEST_COMPLETE: ', e);
        } else {
            console.log('[DASHJS-PROTECTION-PLUGIN] LICENSE_REQUEST_COMPLETE: ', e);
        }
    });
    // Listen for 'keystatuseschange' event to check if license has been successfully received and stored
    player.on(dashjs.MediaPlayer.events.KEY_STATUSES_CHANGED, function (e) {
        console.log('[DASHJS-PROTECTION-PLUGIN] KEY_STATUSES_CHANGED: ', e);
        e.data.session.keyStatuses.forEach(function(status, keyId) {
            console.log("[DASHJS-PROTECTION-PLUGIN] status = " + status + " for session " + sessionToken.session.sessionId);
            switch (status) {
                case "expired":
                    break;
                case "output-restricted":
                    break;
                case "usable":
                    // console.log('[DASHJS-PROTECTION-PLUGIN] SESSION: ', sessionToken.session);
                    // Now, since license has been received, close the MediaKeySession to release its resources
                    // protectionController.closeKeySession(sessionToken);
                    break;
                default:
            }
        });
    });
    // Listen for 'keySessionClosed' event to ensure session has been successfully closed in order to enable (re)loading it afterwards (and avoid QutoExceededError)
    player.on(dashjs.MediaPlayer.events.KEY_SESSION_CLOSED, function (e) {
        if (e.error) {
            console.error('[DASHJS-PROTECTION-PLUGIN] KEY_SESSION_CLOSED: ', e);
        } else {
            console.log('[DASHJS-PROTECTION-PLUGIN] KEY_SESSION_CLOSED: ', e);
        }
    });
    // Listen for errors
    player.on(dashjs.MediaPlayer.events.ERROR, function (e) {
        if (e.error === 'key_session' || e.error === 'key_message') {
            console.error('[DASHJS-PROTECTION-PLUGIN] PROTECTION ERROR: ', e);
        } else {
            console.error('[DASHJS-PROTECTION-PLUGIN] ERROR: ', e);
        }
    });
    player.on(dashjs.MediaPlayer.events.KEY_ERROR, function (e) {
        console.error('[DASHJS-PROTECTION-PLUGIN] KEY_ERROR: ', e);
    });
    */

    /*
    var uri = location.search.substr(1).length > 0 ? location.search.substr(1) : "https://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel-multikey.ism/.mpd";
    player.setFastSwitchEnabled(true);
    player.attachTTMLRenderingDiv(document.getElementById("video-caption"));
    player.attachSource(uri);

    player.setTrackSwitchModeFor('video', 'alwaysReplace');
    player.setTrackSwitchModeFor('audio', 'alwaysReplace');
    */

})();