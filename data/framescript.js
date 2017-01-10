console.error('HELLO!');
var {interfaces: Ci, manager: Cm, results: Cr, utils:Cu} = Components;
// Cm.QueryInterface(Ci.nsIComponentRegistrar);
// Cu.importGlobalProperties(['Blob', 'URL']);

const QUEUE_URL = "https://addons.mozilla.org/en-US/editors/queue/".toLowerCase();

var progressListener = {
    register: function() {
        if (!docShell) console.error('NO DOCSHEL!!!');
        else {
            var webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
            webProgress.addProgressListener(progressListener.listener, Ci.nsIWebProgress.NOTIFY_STATE_WINDOW);
        }
    },
    unregister: function() {
        if (!docShell) console.error('NO DOCSHEL!!!');
        else {
            var webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
            webProgress.removeProgressListener(progressListener.listener);
        }
    },
	listener: {
        onStateChange: function(webProgress, aRequest, flags, status) {
            // console.log('progressListener :: onStateChange:', webProgress, aRequest, flags, status);
            // // figure out the flags
            let flagStrs = [];
            for (let f in Ci.nsIWebProgressListener)
                if (!/a-z/.test(f))
                    if (flags & Ci.nsIWebProgressListener[f])
                        flagStrs.push(f);

    			// console.info('progressListener :: onStateChange, flagStrs:', flagStrs);

			let url;
			try {
				url = aRequest.QueryInterface(Ci.nsIChannel).URI.spec;
			} catch(ignore) {}
			// console.error('progressListener :: onStateChange, url:', url);

			if (url) {
				url = url.toLowerCase();
				console.log('url:', url, 'flagStrs:', flagStrs);
				let window = webProgress.DOMWindow;
				// console.log('progressListener :: onStateChange, DOMWindow:', window);

				if (flags & Ci.nsIWebProgressListener.STATE_START) {
                    let perPage = Services.prefs.getIntPref('extensions.@amoqueue.per-page');
					if (url.startsWith(QUEUE_URL) && !url.includes("per_page") && perPage != 100) {
                        // console.log('url:', url, 'flagStrs:', flagStrs);
						let newUrl = url.replace(/(#.*$)|$/, `?per_page=${perPage}$1`);
						console.log('newUrl:', newUrl);
						aRequest.cancel(Cr.NS_BINDING_ABORTED);
						window.location.href = newUrl;
					}
				}
			}
		},
		QueryInterface: function QueryInterface(aIID) {
			if (aIID.equals(Ci.nsIWebProgressListener) || aIID.equals(Ci.nsISupportsWeakReference) || aIID.equals(Ci.nsISupports)) return progressListener.listener;
			throw Cr.NS_ERROR_NO_INTERFACE;
		}
	}
};

progressListener.register();
