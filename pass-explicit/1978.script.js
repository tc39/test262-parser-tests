function* a() {
  (class {
    [(yield)]() {}
  });
}
;