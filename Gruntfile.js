const sass = require('node-sass');
const request = require('request');
const fs = require('fs');
require('dotenv').config();

module.exports = function (grunt) {
	let pkgJson = require('./package.json'),
		buildXCC = "build/XCC",
		XCCJS = buildXCC + "/js/",
		distCNXCustomizationCSS = "dist/CNX/customization/themes/hikariTheme",
		distXCCDateiablage = "dist/XCC/Dateiablage";

	function createJSBanner() {
		return ['/*! ****************************************************************************',
			' * ICEC - IBM Connections Engagement Center',
			' * CUSTOMIZATION',
			' *',
			' * Build date: <%= grunt.template.today("yyyy-mmm-dd HH:MM:ss") %>',
			' * Version: ' + pkgJson.version,
			' * Project name: ' + pkgJson.name,
			' * Author: ' + pkgJson.author,
			' *',
			' *  Copyright TIMETOACT, <%= grunt.template.today("yyyy") %> All Rights Reserved ',
			' *',
			' **************************************************************************** */',
			''].join("\n");
	}

	grunt.config.init({
		eslint: { // check JS source code with ESLint
			options: {
				"configFile": 'eslint-config.js',
				fix: true
			},
			target: ["build/XCC/js/**/*.js", "build/XCC/i18n/*.json", "!build/XCC/js/lib/*.js"]
		},
		watch: {
			//TODO: Work on Watch --> Sass to CSS and JS compiling
		},
		clean: {
			dist: ["dist/"],
			repo: ["repos"],
			repoWidgets: ["dist/XCC/js/registerWidgets"],
			repoStyleAndLang: ["dist/XCC/css/<%= grunt.option('loadWidget') %>", "dist/XCC/i18n/<%= grunt.option('loadWidget') %>"]
		},
		uglify: {
			options: {
				banner: createJSBanner(),
				sourceMap: true,
				sourceMapIncludeSources: true // we have the files, don't embed them
			},
			dist: {
				files: [{
					expand: true,
					src: [ "**/*.js", "!**/*-min.js","!custom.js"],
					dest: "dist/XCC/js",
					cwd: "dist/XCC/js",
					rename: function(dst, src) {
						return dst + "/" + src.replace(".js", "-min.js");
					}
				}]
			}
		},
		copy: {
			xcc: {
				files: [{
					expand: true,
					cwd: "build/XCC/html/",
					dest: "dist/XCC/html",
					src: ["**"]
				},{
					expand: true,
					cwd: "build/XCC/js/",
					dest: "dist/XCC/js",
					src: ["lib/*.js", "replacedModules/*.js", "otherJs/*.js"]
				},{
					expand: true,
					cwd: "build/XCC/i18n/",
					dest: "dist/XCC/i18n",
					src: ["**"]
				},{
					expand: true,
					cwd: "build/XCC/images/",
					dest: "dist/XCC/images",
					src: ["**"]
				}]
			},
			repoCSS: {
				files: [{
					expand: true,
					cwd: "dist/XCC/css/<%= grunt.option('loadWidget') %>/",
					dest: "dist/XCC/css/",
					src: ["*.css", "!custom.css"],
					ext: ".css"
				}]
			},
			cnx: {
				files: [{
					expand: true,
					cwd: "build/CNX/i18n/",
					dest: "dist/CNX/customization/strings",
					src: ["**"]
				},{
					expand: true,
					cwd: "build/CNX/config-repo/",
					dest: "dist/CNX/config-repo",
					src: ["**"]
				},{
					expand: true,
					cwd: "build/CNX/jsps/",
					dest: "dist/CNX/customization/common/nav/templates",
					src: ["**"]
				},{
					expand: true,
					cwd: "build/CNX/images/",
					dest: "dist/CNX/customization/javascript/com/ibm/lconn/core/styles/images",
					src: ["**"]
				}]
			},
			xccDateiablage: {
				files: [{
					expand: true,
					cwd: "dist/XCC/images",
					dest: distXCCDateiablage,
					src: ["**"]
				},{
					expand: true,
					cwd: "dist/XCC/html",
					dest: distXCCDateiablage,
					src: ["**"]
				},{
					expand: true,
					cwd: "dist/XCC/js",
					dest: distXCCDateiablage,
					src: ["*.js", "!*-min.js"]
				},{
					expand: true,
					cwd: "dist/XCC/js/replacedModules",
					dest: distXCCDateiablage,
					src: ["*.js"]
				},{
					expand: true,
					cwd: "dist/XCC/js/otherJs",
					dest: distXCCDateiablage,
					src: ["*.js"]
				},{
					expand: true,
					cwd: "dist/XCC/js/customWidgets",
					dest: distXCCDateiablage,
					src: ["*.js"]
				},{
					expand: true,
					cwd: "dist/XCC/js/lib",
					dest: distXCCDateiablage,
					src: ["*.js"]
				}
				]
			},
			widgetLangFile: {
				files: [{
					expand:true,
					cwd: "dist/XCC/i18n/<%= grunt.option('loadWidget') %>",
					dest: "dist/XCC/i18n",
					src: ["<%= grunt.option('widgetLangFile') %>"]
				}]
			}
		},
		cssmin: {
			options: {
				shorthandCompacting: false,
				roundingPrecision: -1
			},
			xcc: {
				files: [{
					expand: true,
					src:["*.css"],
					dest: distXCCDateiablage,
					cwd: 'dist/XCC/css',
					ext: '.css'
				}]
			},
			cnx:{
				files:[{
					expand: true,
					src:["**/*.css"],
					dest: distCNXCustomizationCSS,
					cwd: 'dist/CNX/css',
					ext: ".css"
				}]
			}
		},
		sass: {
			options: {
				sourceMap: true,
				implementation: sass
			},
			xcc: {
				files: [{
					expand: true,
					cwd: "build/XCC/sass/",
					dest: "dist/XCC/css",
					src: ["*.scss"],
					ext: ".css"
				}]
			},
			cnx: {
				sourceMap: false,
				files: [{
					expand: true,
					cwd: "build/CNX/sass/",
					dest: "dist/CNX/css",
					src: ["**/*.scss"],
					ext: ".css"
				}]
			}
		},
		concat: {
			options: {
				stripBanners: { // remove comments from the source
					block: false, // all block comments but none that start with /*!
					line: false
				},
				separator: '\n\n\n',
				banner: createJSBanner() + "\n",
				process: function (src, filepath) {
					let fileName = filepath.split(/\\|\//).pop(),
						ret;
					ret = [
						('/* BEGIN source file: ' + fileName + ' (' + src.length + 'B) */'),
						src,
						'',
						('/* END source file: ' + fileName + ' (' + src.length + 'B) */'),
						''
					].join("\n");
					return ret;
				}
			},
			dist: {
				src: [XCCJS + "customWidgets/*.js", XCCJS + "custom.js"],
				dest: "dist/XCC/js/custom.js"
			},
			repo : {
				src: ["dist/XCC/js/customWidgets/*.js", "./dist/XCC/js/custom.js"],
				dest: "dist/XCC/js/custom.js"
			},
			widgetRegister: {
				src: [XCCJS + "widgetRegister.js", "./dist/XCC/js/custom.js"],
				dest: "dist/XCC/js/custom.js"
			},
			css: {
				src: ["dist/XCC/css/<%= grunt.option('loadWidget') %>/custom.css", "dist/XCC/css/custom.css"],
				dest: "dist/XCC/css/custom.css"
			}
		},
		sasslint: {
			options: {
				configFile: 'sass-lint.yml'
			},
			target: ['build/XCC/sass/**/*.scss', 'build/CNX/sass/**/*.scss', "!build/XCC/sass/lib/*.scss", "!build/XCC/sass/**/_all.scss"]
		},
		compress: {
			main: {
				options: {
					mode: 'gzip'
				},
				expand: true,
				cwd: '.',
				ext: '.gz',
				src: ['dist/**/*.css', 'dist/**/*.js', "!dist/XCC/Dateiablage/**/*"],
				dest: '.'
			}
		},
		sass_directory_import: {
			files: {
				src: [
					'build/XCC/sass/variables/**/_all.scss',
					'build/XCC/sass/mixins/**/_all.scss',
					'build/XCC/sass/widgets/**/_all.scss',
					'build/XCC/sass/modules/**/_all.scss',
					'build/XCC/sass/libs/**/_all.scss'
				]
			}
		},
		postcss: {
			options: {
				map: true, // inline sourcemaps
				processors: [
					require('pixrem')(), // add fallbacks for rem units
					require('autoprefixer') // add vendor prefixes, see https://github.com/browserslist/browserslist#queries for queries
				]
			},
			dist: {
				src: ["dist/XCC/css/*.css", "dist/CNX/css/*.css"]
			}
		},
		csscomb: {
			foo: {
				files: [{
					expand: true,
					cwd: "build/XCC/sass/",
					dest: "build/XCC/sass/",
					src: ["**/*.scss"],
					ext: ".scss"
				}]
			}
		},
		babel: {
			options: {
				presets: ['@babel/preset-env']
			},
			dist: {
				files: [{
					expand: true,
					cwd: "dist/XCC/js/",
					dest: "dist/XCC/js/",
					src: ["**/*.js"]
				}]
			}
		}
	});


	grunt.registerTask('default', ["clean:dist", "csscomb", "copy:xcc", "copy:cnx", "sasslint", "sass_directory_import", "sass",
			"postcss", "concat:dist", "concat:widgetRegister", "cssmin", "eslint", "babel", "uglify", "copy:xccDateiablage", "compress"]);


	// load all plugins with the load-grunt-tasks npm package instead of loading them manually
	require('load-grunt-tasks')(grunt);
};
