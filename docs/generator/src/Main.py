import os
import json
from jinja2 import Environment, FileSystemLoader, select_autoescape
import pyparsing as pp

print(os.getcwd())

class ViewLoader(FileSystemLoader):
    def get_source(self, environment, template):
        contents, filename, uptodate = super().get_source(environment, template)

        #single_value = pp.QuotedString(quoteChar="<", endQuoteChar=">")
        #parser = pp.nestedExpr(opener="(", closer=")",
        #               content=single_value,
        #               ignoreExpr=None)

        #identifier = pp.Combine(pp.Combine(pp.Literal("$$") + pp.Word('_' + pp.alphas, None)))
        #single_line = pp.OneOrMore(identifier.setWhitespaceChars(' ')).setParseAction(' '.join)
        #multi_line = pp.OneOrMore(pp.Optional(single_line) + pp.LineEnd().suppress())
        #arg_list = pp.nestedExpr(content= multi_line | single_line, opener="(", closer=")")  # nesting delimiters default to '(' and ')'
        #function_call = identifier("name") + arg_list("args").leaveWhitespace()
        #result = function_call.parseString(contents, parseAll=True);
        
        
        
        def handleParsedFunc(tok):
            func = tok[0][2:]
            if isinstance(tok[1], list) and not isinstance(tok[1][0], list):
                params = tok[1][0]
            else:
                params = " ".join(tok[1])
                tok[1] = params
            tok[0] = ""
            if func == "component":
                template = env.get_template(f"components/html/{params}.html")
                tok[1] = json.dumps(template.render())
            if func == "include":
                tok[1] = env.get_template(tok[1]).render()
            if func == "escape":
                tok[1] = json.dumps(tok[1])
            if func == "template_base":
                template = env.get_template('templates/base.html')
                tok[1] = template.render(json.loads(tok[1]))
            return tok
        if filename.endswith(".view"):
            name = pp.Word(pp.printables, excludeChars="()" )
            enclosed = pp.Forward()
            nestedParens = pp.nestedExpr('(', ')', content=enclosed) 
            func = pp.Combine('$$' + name('name')) + enclosed('body')
            func.setParseAction(handleParsedFunc, callDuringTry=True)
            enclosed << (func | nestedParens | name('body'))
            contents = enclosed.transformString(contents)
        return contents, filename, uptodate

env = Environment(loader=ViewLoader(searchpath="generator/"))
template = env.get_template('views/index.view')
open("output/output.html", "w").write(template.render({}))