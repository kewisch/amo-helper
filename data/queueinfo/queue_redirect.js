self.port.on("per_page", (perPage) => {
  // Redirect to the per_page url. We are replacing the whole seach in case the
  // page query param is specified.
  if (!location.search.includes("per_page") && perPage != 100) {
    window.location.search = "?per_page=" + perPage;
  }
});
