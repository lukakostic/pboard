#include "webview/webview.h"
//https://github.com/webview/webview/tree/master

#include <iostream>

int main() {
  try {
    webview::webview w(false, nullptr);
    w.set_title("PBoard");
    w.set_size(980, 620, WEBVIEW_HINT_NONE);
    w.navigate("http://127.0.0.1:9020");
    //w.set_html("Thanks for using webview!");
    w.run();
  } catch (const webview::exception &e) {
    std::cerr << e.what() << '\n';
    return 1;
  }

  return 0;
}