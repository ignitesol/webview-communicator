/*
 * Javascript object used for communicating with the android application.
 * It exposes two methods for purpose of communication
 *
 * 1) nativeCall - This function allows one to invoke methods on native android
 *                 (Java) objects
 * 2) raiseEvent - This function is used by android applications for invoking
 *                 methods on javascript objects
 */
var WebViewCommunicator =  (function(){
    var platform = guess_platform(),
        registeredObjects = {},
        callbacks = {},
        callbackId = 0;
    /*
     * This method is used by android side of communicator and is
     * not intended to be called from JS code
     */
    function raise_event(object, method, params) {
        object = unescape(object);
        method = unescape(method);
        params = JSON.parse(unescape(params));

        var targetObject = registeredObjects[object];

        if(!targetObject) {
            console.log("WebViewCommunicator: Could not find object '" + targetObject + "' called from android");
        } else {
            var targetMethod = targetObject[method];

            if(targetMethod) {
                targetMethod.apply(targetObject, params);
            } else {
                var errMsg = "WebViewCommunicator: Could not find method '" + targetMethod + "' " +
                        "on object'" + targetObject +"' called from android";
                console.log(errMsg);
            }
        }
    }

    /*
     * This method allows javascript object to expose itself to the android
     * side. Once an object is register the android app can invoke methods on it
     * using the specified 'tag' It throws 'DuplicateTag' exception if any other
     * object is already registered using the specified 'tag'
     *
     * 1) tag: The identifier that the android objects can use for calling the
     *            method, __self is reserved for internal messaging do NOT use
     *            it
     * 2) object: The object that needs to register itself
     */
    function register(tag, object) {
        if(registeredObjects[tag]) {
            throw {
                name : "DuplicateTag",
                message : "Another object already registered with tag '" + tag + "'"
            };
        }
        registeredObjects[tag] = object;
    }
    /**
     * Determine the mobile operating system.
     * This function returns one of 'iOS', 'Android', 'Windows Phone', or 'unknown'.
     *
     * @returns {String}
     */
    function checkUserAgent() {
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // Windows Phone must come first because its UA also contains "Android"
        if (/windows phone/i.test(userAgent)) {
            return "Windows Phone";
        }

        if (/android/i.test(userAgent)) {
            return "Android";
        }

        // iOS detection from: http://stackoverflow.com/a/9039885/177710
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return "iOS";
        }

        return false;
    }

    function isIOSWebView() {
        var is_uiwebview = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);
        var is_safari_or_uiwebview = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);
        return is_uiwebview && is_safari_or_uiwebview;
    }/*
     * Since now we are trying to support both platforms (iOS and android) using
     * the same JS code we need a way to determine the platform the script is
     * running. Here we try to guess the platform by check the availability of
     * _WebViewCommunicator which is injected only when we work on android.
     */
    function guess_platform() {
        if (typeof _WebViewCommunicator === "undefined") {
            var userAgent = checkUserAgent();
            if(userAgent && userAgent == "iOS" && isIOSWebView()) {
                return "ios";
            } else {
                return undefined;
            }
        } else {
            return "android";
        }
    }
    
    /*
     * Explicitly set the platform the code is running on
     */
    function set_platform(_platform) {
        _platform = _platform.toLowerCase();
        if(platform === "android" || platform === "ios") {
            platform = _platform;
        } else {
            console.log("Platform not supported");
        }
    }

    /*
     * This method allows the user to call methods on native android objects. It
     * accepts three parameters
     *
     * 1) tag: The 'identifier' the desired android object is registered with
     *         during initialization at the android application side. It is of
     *         type string 2) method: The method we wish to invoke on the
     *         desired android object. It is of type string 3) The rest of the
     *         arguments are interpreted as arguments to be passed to the method
     *         when invoking it
     *
     */
    function native_call(tag, method) {
        var params = Array.prototype.slice.call(arguments, 2),
            dummyCallbackId = 0;

        if (platform === "android") {
            native_call_android(tag, method, dummyCallbackId, params);
        } else if (platform === "ios") {
            native_call_ios(tag, method, dummyCallbackId, params);
        }
    }

    /*
     Credits: http://stackoverflow.com/a/6000016
     */
    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    /*
     PURPOSE: Call a specified native method. And when the method is done with, call the
     specified callback handler with the data the native method responds with
     PARAMS: 1. tag 2. method have their usual meaning. 3. callback has to be a valid javascript function
     TODO We need to refactor this code with the nativeCall method as both do almost a similar job.
     */
    function nativeCallWithCallback(tag, method, callback) {
        var __callbackId = 0;
        // Incase the callback is a valid javascript function
        // add it to the callbacks associative array
        if(isFunction(callback)) {
            // The callbackId is incremented by one everytime the nativeCallWithCallback method is called
            callbackId += 1;
            __callbackId = callbackId;
            //Register the specified callback with an id
            callbacks[callbackId] = callback;
        } else {
            // In case no callback is specified throw an error
            return;
        }
        // Get the other params.
        var params = Array.prototype.slice.call(arguments, 3);
        // Platform specific native call for the methods.
        // We pass on the callbackId as an extra parameter
        if (platform === "android") {
            native_call_android(tag, method, __callbackId, params);
        } else if (platform === "ios") {
            native_call_ios(tag, method, __callbackId, params);
        } else {
            // In case the platorm is undefined it means we are not on
            // sdk and hence directly call in the callback function provided.
            if(callbackId) {
                callbacks[callbackId].apply(this, [{isSdk : false, enableNative : false}]);
            }
        }
    }

    function native_call_android(tag, method, callbackId, params){
        return _WebViewCommunicator.nativeCall(tag, method, callbackId, JSON.stringify(params));
    }

    function native_call_ios(tag, method, callbackId, params) {
        function getURL(tag, method, params) {
            var url = "js:WebViewCommunicator/" + tag + "/" + method + "/" + encodeURIComponent(JSON.stringify(params));
            return url;
        }

        var ifr = document.createElement('iframe');
        ifr.setAttribute('src', getURL(tag, method, params));
        document.documentElement.appendChild(ifr);

        ifr.parentElement.removeChild(ifr);
        ifr = null;
    }

    register("__self", {
        log : function (message) {
            console.log(message);
        },
        callback : function (resp) {
            var callbackId = resp.callbackId;
            if(callbackId > 0) {
                // Call the call back handler
                // with the response object 1. resp obtained from the native method call
                callbacks[callbackId].apply(this, [resp]);
            }
        }
    });

    return ({
        raiseEvent : raise_event,
        nativeCall : native_call,
        nativeCallWithCallback : nativeCallWithCallback,
        register : register,
        setPlatform : set_platform
    });
})();
