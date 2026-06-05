import terser from '@rollup/plugin-terser';

export default {
  input: 'src/behaviors.mjs',
  output: {
    file: 'behaviors.js',
    format: 'iife',
    indent: true,
  },
  plugins: [
    terser({ compress: false, mangle: false, format: { comments: /^\!|@license|@preserve|copyright/i, beautify: true } })
  ]
};
