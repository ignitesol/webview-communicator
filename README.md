# What is WebView-Communicator?

WebView-Communicator simplifies the communication between the the WebView and and the underlying

(iOS or Android) application.

With WebView-Communicator you can simply `register` your objects and call its methods 
with desired arguments. Right now the library supports only asynchronous calls.

# How to use it?

For using WebView-Communicator you will need to set it up in your `WebView` as well as
in the underlying iOS or Android application.

##1. Setup

+ ###In WebView

    You will need to include the communicator.js in desired webview.
    NOTE: This step is identical for Android as well as iOS.

```
<script type="text/javascript" src="/path/to/communicator.js"></script>
```    

+ ###In android activity

    In case of Android you will need to create an instance of WebViewCommunicator, it accepts two parameters

1. An instance of `WebView` with which you want to use the communicator
2. An instance `Handler`

```java
WebView myWebView = new WebView(this);
Handler myHandler = new Handler();
WebViewCommunicator myCommunicator = new WebViewCommunicator(myWebView, myHandler);
```

+ ###In iOS application
    
    You will need to create an instance of WebViewCommunicator, you will need to provide it with the instance of
    webview you wish to communicate with ('webview' is the instance of 'UIWebView' you want to communicate with)
    
```objective-c
WebViewCommunicator* communicator = [[WebViewCommunicator alloc] initWithWebView:webview];
```

##2. Usage

### Java -> Javascript

####Step 1.
Once setup you can now register the Javascript objects that you want to call from     the activity as follows (In Javascript)

```javascript
WebViewCommunicator.register("myObject", {
   mymethod : function(a, b, c){
         //...
   }
});
```

The first argument to `register` is the `tag` that will can be used for communicating
with this object by the activity ("__self" is reserved for internal use), the second
argument is your object.

####Step 2.
Now from you activity you can call the object registered above as follows (arguments are packed in JSONArray)

```java
// Pack the arguments in JSONArray
JSONArray args = new JSONArray();
args.put("first_args");
args.put(1);

// Call myObject's 'mymethod' with the arguments
myCommunicator.callJS("myObject", "mymethod", args);
```

where `myCommunicator` is the instance of `WebCommunicator`. 

### Objective C -> Javascript
####Step 1.
This is same as Step 1. of above
    
####Step 2.
From you application you can call the object registered in Step 1. as follows (arguments are packed in NSMutableArray)

```objective-c
// Pack the arguments in NSMutableArray
NSMutableArray *args = [[NSMutableArray alloc] init];
[args addObject: @"first_args"];
[args addObject:[[NSNumber alloc] initWithInt:1]];

// Call myObject's 'mymethod' with the arguments
[self.communicator callJS:@"Communicator" onMethod:@"fromObjC" withArguments:args];

```

### Javascript -> Native (Java or Objective C)

####Registering native objects
The first step is to register the native object as follows

#####1. Java        
A Java object that wants to expose itself to Javascript needs to implement 'MessageReciever'
interface. The interface defines `receiveCallFromJS` method. Whenever a Java object is called from
Javascript, the `receiveCallFromJS` method of the object recieves two arguments, the method is
called name of the method called and the arguments passed to the method as a `JSONArray`.

The object can then be registered to recieve Javascript messages using the `registerObject` method of
WebViewCommunicator.

```java
myCommunicator.register("UIManager", new Communicator() {
    @Override
    public void router(String method, JSONArray arg) {
        if(method.equals("exit") {
            confirmExit(arg.getString(0));
        }
    }
});
```

#####2. Objective C
In Objective C, the object that wants to expose itself to Javascript needs to implement the
'MessageReciever' protocol. The protocol defines `receiveCallFromJS` method. Whenever an 
Objective C object is called from Javascript, the `receiveCallFromJS` method of the object recieves 
two arguments, the method is called name of the method called and the arguments passed to the method 
as a `NSArray`.

The `receiveCallFromJS` can then call the desired methods. eg

```objective-c
@interface ExitManager <MessageReciever>
- (void) confirmExit:(NSString*)message;
@end

@implementation ExitManager
- (void) receiveCallFromJS:(NSString *)method withArguments:(NSArray *)arguments {
    if ([method isEqualToString:@"exit"]) {
        [self confirmExit:[arguments objectAtIndex:1]];
    }
}

...

@end
```

The object can then be registered to recieve Javascript messages using the `registerObject` method of
WebViewCommunicator.

```objective-c
[self.communicator registerObject:[[ExitManager alloc] init] withTag:@"UIManager"];
```

####Calling the object

Finally you call the registered Java or Objective C object from Javascript as follows

```javascript
WebViewCommunicator.nativeCall("UIManager", "exit");
```

# Tips

You can explicitly set the plaform on which the JS code is running using the `setPlatform` method of `WebViewCommunicator`.

# Caveats

In iOS `WebViewCommunicator` assigns itself as the delegate for `UIWebView` as a result assigning delegates
to the `UIWebView` may not work as expected.
