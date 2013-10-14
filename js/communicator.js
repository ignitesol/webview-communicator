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
    var platform = guess_platform();
    var registered_objects = {};
    /*
     * This method is used by android side of communicator and is
     * not intended to be called from JS code
     */
    function raise_event(object, method, params) {
        object = unescape(object);
        method = unescape(method);
        params = JSON.parse(unescape(params));

        var target_object = registered_objects[object];

        if(!target_object) {
	    console.log("WebViewCommunicator: Could not find object '" + target_object + "' called from android");
        } else {
	    var target_method = target_object[method];

	    if(target_method) {
                target_method.apply(target_object, params);
	    } else {
                var err_msg = "WebViewCommunicator: Could not find method '" + target_method + "' " +
		    "on object'" + target_object +"' called from android";
                console.log(err_msg);
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
        if(registered_objects[tag]) {
	    throw {
                name : "DuplicateTag",
                message : "Another object already registered with tag '" + tag + "'"
	    };
        }
        registered_objects[tag] = object;
    }

    /*
     * Since now we are trying to support both platforms (iOS and android) using
     * the same JS code we need a way to determine the platform the script is
     * running. Here we try to guess the platform by check the availability of
     * _WebViewCommunicator which is injected only when we work on android.
     */
    function guess_platform() {
	if (typeof _WebViewCommunicator === "undefined") {
	    return "ios";
	} else {
	    return "android";
	}
    }

    function set_platform(_platform) {
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
        var params = Array.prototype.slice.call(arguments, 2);

        if (platform === "android") {
	    native_call_android(tag, method, params);
	} else if (platform === "ios") {
	    native_call_ios(tag, method, params);
	}
	
    }

    function native_call_android(tag, method, params){
	return _WebViewCommunicator.nativeCall(tag, method, JSON.stringify(params));
    }

    function native_call_ios(tag, method, params) {
	function getURL(tag, method, params) {
	    var url = "js:WebViewCommunicator/" + tag + "/" + method + "/" + JSON.stringify(params);
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
        }
    });

    return ({
        raiseEvent : raise_event,
        nativeCall : native_call,
        register : register,
	setPlatform : set_platform
    });
})();
