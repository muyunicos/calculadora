"use strict";
(() => {
  var import_react = require("react");
  function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = (0, import_react.useState)(value);
    (0, import_react.useEffect)(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
  }
})();
