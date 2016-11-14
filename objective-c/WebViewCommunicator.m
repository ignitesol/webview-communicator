//
//  WebViewCommunicator.m
//  HelloWorld
//
//  Created by Iqbal Ansari on 10/10/13.
//  Copyright (c) 2013 Iqbal Ansari. All rights reserved.
//

#import "WebViewCommunicator.h"

@implementation WebViewCommunicator : NSObject

/*
 * Method to initialize our communicator, it accepts the webview with which we want to communicate with.
 */
- (id) initWithWebView:(UIWebView *)webview {
    self = [super init];
    
    // We first store the webview and then assign ourselves as delegates so that we can catch url load requests
    // TODO: Right now we assume we are the only delegates as such the user will not be able to assign
    // his own delegates to the webview we can solve this by storing the delegate assigned by the user and
    // pass it the events we recieve as need to the delegate.
    
    if(self) {
        self.target = webview;
        webview.delegate = self;
        self.registeredObjects = [[NSMutableDictionary alloc] init];
    }
    
    return self;
}


/*
 * A simple method to get the JS code to execute for a function also does urlencoding of the arguments
 */
- (NSMutableString*) _getJSCode:(NSString*)tag onMethod:(NSString* )method withArguments:(NSMutableArray*) arguments {
    NSMutableString* jsCode = [[NSMutableString alloc] initWithString:@"WebViewCommunicator.raiseEvent(\""];
    
    // Convert arguments array to JSONString and encode it
    NSString *argumentsAsJSONString = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:arguments
                                                                                                     options:0
                                                                                                       error:nil]
                                                            encoding:NSUTF8StringEncoding];
    
    NSString *encodedArguments = [argumentsAsJSONString stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
    
    // Create the string to be executed as javascript TODO: Looks ugly make it pretty
    [jsCode appendString:tag];
    [jsCode appendString:@"\",\""];
    [jsCode appendString:method];
    [jsCode appendString:@"\",\""];
    [jsCode appendString:encodedArguments];
    [jsCode appendString:@"\");"];
    NSLog(@"The arguments: %@", jsCode);
    return jsCode;
}


/*
 * Method to call a javascript object from the objective c, it accepts the name of the javascript object (actually
 * the tag the object is registered with) the method name and the arguments in the form of NSMutableArray
 */
- (void) callJS:(NSString *)object onMethod:(NSString *)method withArguments:(NSMutableArray *)arguments {
    [self.target stringByEvaluatingJavaScriptFromString:[self _getJSCode:object
                                                                onMethod:method
                                                           withArguments:arguments]];
}

/*
 * Objects interested in recieving requests from webview can register using this method. The objects should 
 * conform to WVCommunciator protocol.
 *
 * If an object is successfully registered return YES else NO
 */
- (BOOL) registerObject:(id <MessageReciever>) object withTag:(NSString*) tag {
    
    // We first check if any object is already registered, if so we don't register present object
    if ([self.registeredObjects objectForKey:tag]) {
        NSLog(@"Tag %@ is already in use", tag);
        return NO;
    }
    [self.registeredObjects setObject:object forKey:tag];
    return YES;
}

/*
 * Here we trap the load event from the webview. We recieved this event because we have assigned ourselves as delegate
 * for the webview. We check if the url has a prefix defined by COMMUNICATOR_PREFIX, if so we handle this loading else
 * we allow the webview to do its work
 */
- (BOOL) webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    NSMutableString *urlString = [NSMutableString stringWithString:[[request URL] absoluteString]];
    
    if([urlString hasPrefix:(WVCOMMUNICATOR_PREFIX)]) {
        
        // The format of the url that we are interested in is of format WVCOMMUNICATOR_PREFIX<tag>/<method>/[<argument>]*
        // We extract these from the string.
        
        [urlString deleteCharactersInRange:NSMakeRange(0, [WVCOMMUNICATOR_PREFIX length])];
        
        // We decode the url since it is url encoded and split it into components separated by "/"
        NSString *decodeURL = [[urlString
                                 stringByReplacingOccurrencesOfString:@"+" withString:@" "]
                                stringByReplacingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
        
        NSMutableArray* components = [[decodeURL componentsSeparatedByString:@"/"] mutableCopy];
        
        id <MessageReciever> target = [self.registeredObjects objectForKey:[components objectAtIndex:0]];
        NSString *method = [components objectAtIndex:1];
        
        /*
            Removing the 0th and the 1st elements
            Reason: 
            Basically if there are / in the <arguments> part of the request, then when splitting the request,
            they also get split, and just JSON parsing the component[2] won't work (it might give out nil too).
            So,need the next two steps - remove the first 2 elements, join the rest of the array using / and JSON.parse it.
         */
        [components removeObjectsInRange:NSMakeRange(0, 2)];
        NSString *respStr = [components componentsJoinedByString:@"/"];
        
        // Convert the arguments from of JSON array to NSArray
        NSArray *arguments = [NSJSONSerialization JSONObjectWithData: [respStr dataUsingEncoding:NSUTF8StringEncoding]
                                                             options: NSJSONReadingMutableContainers
                                                               error: nil];

        
        // Finally invoke the target with the method name and the arguments array
        [target receiveCallFromJS:method withArguments:arguments];
        
        // Stop webview from loading this url
        return NO;
    }
    
    return YES;
}

@end
