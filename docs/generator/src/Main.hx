package;
import haxe.Http;
import haxe.io.Path;
import haxe.Json;
import sys.io.File;
import sys.FileSystem;
import haxe.Template;
class Main {
	static inline var TEMPLATE_FILE_EXTENSION = "view";
	static var global_macros:Dynamic = null;
	static function main() {
		var tag:String = GetLastGitTag();
		trace('template generator building tag ${tag}[${Date.now()}]');

		// create output folder

		FileSystem.createDirectory("../output");

		// update ../output/uapi.js

		// trying fixed uapi.js that's known good

		// trace("fetching latest uapi.js");
		// try{
		// 	var uapi:String = Http.requestUrl("http://demo.unified-streaming.com/mse-toolbox/uapi.js");
		// 	trace(uapi.split("\n")[1]);
		// 	var f = File.write("./static/uapi.js");
		// 	f.writeString(uapi);
		// 	f.close();
		// }catch(e:Dynamic){
		// 	trace(e);
		// }
		
		// template arguments (base path etc)

		var featurepage_json = haxe.Resource.getString("featurepage_json");
		var basepath = Sys.getEnv("BASEPATH");
		var demoserver = Sys.getEnv("DEMO_SERVER");
		Reflect.setField(Template.globals, "basepath", basepath != null ? basepath : "");
		Reflect.setField(Template.globals, "demoserver", demoserver != null ? demoserver : "demo.unified-streaming.com");
		Reflect.setField(Template.globals, "build_version", '${tag}[${Date.now()}]');
		Reflect.setField(Template.globals, "featurepage_json", featurepage_json != null ? featurepage_json : "");

		// template '$$func()' macro functions
		var unique = 0;
		var css = [];
		global_macros = 
		{ 
			template_base: Reflect.makeVarArgs(function(args){
				args.shift();
				var template = new Template(read_str_file("templates/base.html"));
				var parsed_args = Json.parse(args.join(","));
				Reflect.setField(parsed_args, 'pages_css', css.join("\n"));
				css = [];
				return template.execute(parsed_args, global_macros);
			}),
			component: Reflect.makeVarArgs(function(args:Array<Dynamic>){
				args.shift();
				var component = args.shift();
				var fixedArgs = [];
				var buf = new Array<String>();
				for(a in args){
					if(StringTools.endsWith(StringTools.trim(Std.string(a)), "}")){
						buf.push(a);
						fixedArgs.push(buf.join(","));
						buf = new Array<String>();
					}else 
						buf.push(a);
				}
				fixedArgs.push(buf.join(","));
				var c = tmpl_from_component(component, fixedArgs[0].length > 0 ? Json.parse(fixedArgs[0]) : null, fixedArgs[1]);
				
				if(c.css != null){
					css.push(c.css);
				}
				
				return escape(c.html);
			}),
			escape: Reflect.makeVarArgs(function(args){
				args.shift();
				return escape(args.join(","));
			}),
			read_str_file: Reflect.makeVarArgs(function(args){
				args.shift();
				return escape(read_str_file(args[0]));
			}),
			include: Reflect.makeVarArgs(function(args){
				args.shift();
				return new Template(read_str_file(args[0])).execute(unique++);
			})
		}
		processDir("./views", function(file){
			var path = new Path(StringTools.replace(file, "./views", ""));
			FileSystem.createDirectory('../output${path.dir}/');
			if(path.ext == TEMPLATE_FILE_EXTENSION){
				trace('found ${file}..');
				var template = new Template(read_str_file(file));
				var f = File.write('../output${path.dir}/${path.file}.html');
				f.writeString(template.execute(null, global_macros));
				f.close();
				trace('compiled to  ../output${path.dir}/${path.file}.html');
			}else{
				File.copy(file, '../output${path}');
			}
		});
		copyDir("./static", "../output");
	}
	static function processDir(path:String, cb:String->Void) : Void
	{	
		if (sys.FileSystem.exists(path) && sys.FileSystem.isDirectory(path))
		{
			var entries = sys.FileSystem.readDirectory(path);
			for (entry in entries) 
				if (sys.FileSystem.isDirectory(path + '/' + entry)) {
					processDir(path + '/' + entry, cb);
				} else 
					cb('${path}/${entry}');
		}
	}
	static function copyDir(path:String, target:String) : Void
	{
		if(!sys.FileSystem.exists(target))
			FileSystem.createDirectory(target);
		
		if (sys.FileSystem.exists(path) && sys.FileSystem.isDirectory(path))
		{
			var entries = sys.FileSystem.readDirectory(path);
			for (entry in entries) 
				if (sys.FileSystem.isDirectory(path + '/' + entry)) {
					FileSystem.createDirectory('${target}/${path}/${entry}');
					copyDir(path + '/' + entry, target);
				} else {
					if(!sys.FileSystem.exists('${target}/${path}'))
						FileSystem.createDirectory('${target}/${path}');
					File.copy('${path}/${entry}', '${target}/${path}/${entry}');
				}
		}
	}
	static inline function escape(str){
		//escape backslash and double quote
		return Json.stringify(str);
	}
	static inline function read_str_file(file){
		var data = File.read(file).readAll();
		return data.toString();
	}
	static inline function tmpl_from_component(component, ?arguments:Dynamic = null, ?css:String = null){
		var css_output = [];
		component = StringTools.trim(component);
		var file_css = './components/css/${component}.css';
		var file_html = './components/html/${component}.html';
		var data_css = FileSystem.exists(file_css) ? read_str_file(file_css) : null;
		var data_html = FileSystem.exists(file_html) ? read_str_file(file_html) : "";
		if(arguments == null)
			arguments = {};
		if(css != null)
			css_output.push(css);
		if(data_css != null)
			css_output.push(data_css);
		return { html: new Template(data_html).execute(arguments, global_macros), css: '${css_output.join("\n")}' };
	}

	macro public static function GetLastGitTag() {
		var p = try new sys.io.Process("git", ["describe" ,"--tags"]) catch ( e : Dynamic ) { trace("no git command found: " +  e); return macro ""; };
		var output = p.stdout.readAll().toString();
		p.stdout.close();
		output.split("\r").join("").split("\n").join("");
		output = StringTools.trim(output);	
		return macro $v{output};
	}
}
