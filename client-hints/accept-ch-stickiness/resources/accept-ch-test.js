const echo = "/client-hints/accept-ch-stickiness/resources/echo-client-hints-received.py";
const accept = "/client-hints/accept-ch-stickiness/resources/accept-ch.html";
const httpequiv_accept = "/client-hints/accept-ch-stickiness/resources/http-equiv-accept-ch.html";
const expect = "/client-hints/accept-ch-stickiness/resources/expect-client-hints-headers.html"
const do_not_expect = "/client-hints/accept-ch-stickiness/resources/do-not-expect-client-hints-headers.html"

const host_info = get_host_info();

function verify_initial_state(initial_url, test_name) {
  promise_test(t => {
    return fetch(initial_url).then(r => {
      assert_equals(r.status, 200)
      // Verify that the browser did not include client hints in the request
      // headers when fetching echo-client-hints-received.py.
      assert_false(r.headers.has("device-memory-received"),
        "device-memory-received");
    });
  }, test_name + " precondition: Test that the browser does not have client " +
    "hints preferences cached");
}

function verify_iframe_state(expect_url, test_name) {
  promise_test(t => {
    return new Promise(resolve => {
      window.addEventListener('message', t.step_func(function(e) {
        assert_equals(e.data, "PASS", "message from opened frame");
        fetch("/client-hints/accept-ch-stickiness/resources/clear-site-data.html").then(resolve);
        resolve();
      }));
      const iframe = document.createElement("iframe");
      iframe.src = expect_url;
      document.body.appendChild(iframe);
    });
  }, test_name + " got client hints according to expectations.");
}

function verify_navigation_state(expect_url, test_name) {
  promise_test(t => {
    return new Promise(resolve => {
      let win;
      window.addEventListener('message', t.step_func(function(e) {
        win.close();
        assert_equals(e.data, "PASS", "message from opened page");
        fetch("/client-hints/accept-ch-stickiness/resources/clear-site-data.html").then(resolve);
      }));
      // Open a new window. Verify that the user agent attaches client hints.
      win = window.open(expect_url);
      assert_not_equals(win, null, "Popup windows not allowed?");
    });
  }, test_name + " got client hints according to expectations.");
}

function verify_subresource_state(expect_url, test_name) {
  promise_test(t => {
    return fetch(expect_url).then(response => {
      return response.text();
    }).then(text => {
      assert_true(text.includes("PASS"));
    });
  }, test_name + " got client hints according to expectations.");
}
const run_test = test => {
  // First, verify the initial state to make sure that the browser does not have
  // client hints preferences cached from a previous run of the test.
  verify_initial_state(test.initial_url, test.name);

  // Then, attempt to set Accept-CH
  promise_test(t => {
    return new Promise(resolve => {
      if (test.type == "navigation") {
        const win = window.open(test.accept_url);
        assert_not_equals(win, null, "Popup windows not allowed?");
        addEventListener('message', t.step_func(() => {
          win.close();
          resolve();
        }), false);
      } else if (test.type == "iframe") {
        const iframe = document.createElement("iframe");
        iframe.addEventListener('load', t.step_func(() => {
          resolve();
        }), false);
        iframe.src = test.accept_url;
        document.body.appendChild(iframe);
      } else if (test.type == "subresource") {
        fetch(test.accept_url).then(r => {
          assert_equals(r.status, 200, "subresource response status")
          // Verify that the browser did not include client hints in the request
          // headers, just because we can..
          assert_false(r.headers.has("device-memory-received"),
            "device-memory-received",
            "subresource request had no client hints");
          resolve();
        });
      } else {
        assert_unreached("unknown test type");
      }
    });
  }, test.name + " set Accept-CH");

  // Finally, verify that CH are actually sent (or not) on requests
  verify_navigation_state(test.expect_url, test.name);
};

