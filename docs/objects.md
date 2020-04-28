# Objects {docsify-ignore-all}

- [Table](metadata/table.md)
- [Sequence](metadata/sequence.md)

```javascript
const differ = new Differ();

differ.define('table', {
  /* table properties */
});

differ.define('sequence', {
  /* sequence properties */
});

differ
  .sync({ allowClean: { foreignKeys: true } })
  .then(() => console.log('database ready'));
```
