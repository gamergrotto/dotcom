var gulp = require('gulp');
var less = require('gulp-less');
var browserSync = require('browser-sync').create();
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var pkg = require('./package.json');
var imagemin = require('gulp-imagemin');
var clean = require('gulp-clean');
var s3 = require('gulp-s3-upload')({});
var run_sequence = require('run-sequence');

// Set the banner content
var banner = ['/*!\n',
    ' * Start Bootstrap - <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n',
    ' * Copyright 2013-' + (new Date()).getFullYear(), ' <%= pkg.author %>\n',
    ' * Licensed under <%= pkg.license.type %> (<%= pkg.license.url %>)\n',
    ' */\n',
    ''
].join('');

var paths = {
    source: 'source/',
    build: 'build/',
    html: ['html/**'],
    images: ['images/**/*'],
    extras: ['extras/favicon.ico'],
    bootstrap: ['node_modules/bootstrap/dist/**/*', '!**/npm.js', '!**/bootstrap-theme.*', '!**/*.map'],
    jquery: ['node_modules/jquery/dist/jquery.js', 'node_modules/jquery/dist/jquery.min.js'],
    simple_line_icons: ['node_modules/simple-line-icons/*/*'],
    font_awesome: [
        'node_modules/font-awesome/**',
        '!node_modules/font-awesome/**/*.map',
        '!node_modules/font-awesome/.npmignore',
        '!node_modules/font-awesome/*.txt',
        '!node_modules/font-awesome/*.md',
        '!node_modules/font-awesome/*.json'
    ]
};

// Copy all other files to build directly
gulp.task('copy', function() {
    gulp.src(paths.bootstrap)
        .pipe(gulp.dest(paths.build + 'lib/bootstrap/'));

    gulp.src(paths.jquery)
        .pipe(gulp.dest(paths.build + 'lib/jquery/'));

    gulp.src(paths.simple_line_icons)
        .pipe(gulp.dest(paths.build + 'lib/simple-line-icons/'));

    gulp.src(paths.font_awesome)
        .pipe(gulp.dest(paths.build + 'lib/font-awesome/'));

    gulp.src(paths.source + paths.html)
        .pipe(gulp.dest(paths.build));

    return gulp.src(paths.source + paths.extras)
        .pipe(gulp.dest(paths.build))
});

// Delete the build directory
gulp.task('clean', function() {
    return gulp.src(paths.build)
        .pipe(clean());
});

// Imagemin images and ouput them in build
gulp.task('imagemin', function() {
    return gulp.src(paths.images, {cwd: paths.source})
        .pipe(imagemin())
        .pipe(gulp.dest(paths.build + 'images/'));
});

// Compile LESS files from /less into /css
gulp.task('less', function() {
    return gulp.src(paths.source + 'less/new-age.less')
        .pipe(less())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(gulp.dest(paths.build + 'css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Minify compiled CSS
gulp.task('minify-css', ['less'], function() {
    return gulp.src(paths.source + 'css/new-age.css')
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.build + 'css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Minify JS
gulp.task('minify-js', function() {
    return gulp.src(paths.source + 'js/new-age.js')
        .pipe(uglify())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.build + 'js'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Run compile scripts
gulp.task('scripts', ['minify-css', 'minify-js']);

// Run everything
gulp.task('default', function(callback) {
    run_sequence('clean',
        ['scripts', 'imagemin', 'copy'],
        callback);
});

// Configure the browserSync task
gulp.task('browserSync', function() {
    return browserSync.init({
        server: {
            baseDir: 'build'
        }
    })
});

// Dev task with browserSync
gulp.task('dev', ['default', 'browserSync'], function() {
    gulp.watch(paths.build + '*.html', ['static']);
    gulp.watch(paths.build + 'js/*.js', ['minify-js']);
    // gulp.watch(paths.build + 'less/*.less', ['less']);
    gulp.watch(paths.build + 'css/*.css', ['minify-css']);
    // Reloads the browser whenever HTML or JS files change
    gulp.watch(paths.build + '**/*', browserSync.reload);
});

// Deploy
gulp.task('deploy', ['default'], function() {
    gulp.src(paths.build + '**/*')
        .pipe(s3({
            Bucket: 'gamergrotto.com', //  Required
            ACL:    'public-read'       //  Needs to be user-defined
        }, {
            // S3 Constructor Options, ie:
            maxRetries: 5
        }))
});