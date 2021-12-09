// Depending on the current location of the cursor, replace the current node with the HTML in `lang`
// This cannot be an arrow function because tinyMCE accesses it via a new keyword.
tinymce.PluginManager.add('language', function (editor) {	
	const BROWSER_DEFAULT = 'BROWSER_DEFAULT';
	const languages = {
	  // not a language, used to represent absence of a language defaulting to browser language
		BROWSER_DEFAULT: {
			name: 'Browser default',
			nativeName: 'Browser default',
		},
		mi: {
			name: 'Māori',
			nativeName: 'te reo Māori',
		},
		en: {
			name: 'English',
			nativeName: 'English',
		},
		zh: {
			name: 'Chinese',
			nativeName: '中文 (Zhōngwén), 汉语, 漢語',
		},		
		hi: {
			name: 'Hindi',
			nativeName: 'हिन्दी, हिंदी',
		},
		ko: {
			name: 'Korean',
			nativeName: '한국어 (韓國語), 조선말 (朝鮮語)',
		},
		sm: {
			name: 'Samoan',
			nativeName: 'gagana faa Samoa',
		},
		to: {
			name: 'Tonga (Tonga Islands)',
			nativeName: 'faka Tonga',
		},
		tl: {
			name: 'Tagalog',
			nativeName: 'Wikang Tagalog, ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔',
		},
	};

	
  const replaceText = (lang) => {
    const selectedNode = editor.selection.getNode();
    const newText = editor.selection.getContent({ format: 'html' });
    const contents = newText || '&#65279'; // use zero-width character as placeholder if no existing text
    const newSpanText = lang === BROWSER_DEFAULT ? `<span id="new_span">${contents}</span>` : `<span lang="${lang}" id="new_span">${contents}</span>`;
    editor.selection.setContent(''); // delete any existing text
    // may be in the middle of the span, so split it into two
    if (selectedNode.nodeName === 'SPAN') {
      if (selectedNode.lang) {
        editor.execCommand('mceInsertRawHTML', false, `</span>${newSpanText}<span lang="${selectedNode.lang}">`);
      } else {
        editor.execCommand('mceInsertRawHTML', false, `</span>${newSpanText}<span>`);
      }
    } else { // could be inside another tag like <a> or <b> that is a descendant of a span
      const parentSpan = tinymce.DOM.getParent(selectedNode, n => n.nodeName === 'SPAN' && !n.dataset.mceBogus);
      if (parentSpan) {
        let currentNode = selectedNode;
        let insertedText = newSpanText;
        while (currentNode !== parentSpan) { // wrap new span with same tags
          insertedText = `<${currentNode.nodeName.toLowerCase()}>${insertedText}</${currentNode.nodeName.toLowerCase()}>`;
          currentNode = currentNode.parentNode;
        }
        // create new span with or without lang attribute, depending on parent span
        if (parentSpan.lang) {
          insertedText = `</span>${insertedText}<span lang="${parentSpan.lang}">`;
        } else {
          insertedText = `</span>${insertedText}<span>`;
        }
        currentNode = selectedNode;
        while (currentNode !== parentSpan) { // close out old tags and create new ones at the end of inserted content
          insertedText = `</${currentNode.nodeName.toLowerCase()}>${insertedText}<${currentNode.nodeName.toLowerCase()}>`;
          currentNode = currentNode.parentNode;
        }
        editor.execCommand('mceInsertRawHTML', false, insertedText);
      } else { // conservatively insert HTML
        editor.execCommand('mceInsertRawHTML', false, newSpanText);
      }
    }
    const newSpan = editor.dom.get('new_span');
    editor.selection.select(newSpan);
    editor.selection.collapse(false); // moves cursor to end of selection
    newSpan.removeAttribute('id');
  };
 
  // Get the language of the current cursor position
  const getSelectedLanguage = (editor) => {
    const selectedNode = editor.selection.getNode();
    let selectedLang;
    // TinyMCE inserts bogus span that have no meaning for language
    if (selectedNode.nodeName === 'SPAN' && !selectedNode.dataset.mceBogus) {
      selectedLang = selectedNode.lang;
    } else if (selectedNode.nodeName === 'P') { // we never add a lang attribute to a p tag
      selectedLang = null;
    } else { // might be inside another tag such as <b> or <a>
      const parentSpan = tinymce.DOM.getParent(selectedNode, n => n.nodeName === 'SPAN' && !n.dataset.mceBogus);
      if (parentSpan) {
        selectedLang = parentSpan.lang;
      } else {
        selectedLang = null;
      }
    }
    return selectedLang;
  };

  editor.addButton('language', {
    text: 'Browser default language',	
	id: `lang-${editor.id}`,
	onclick: function() {
		var buttonApi = this;
		const selectedNode = editor.selection.getNode();
		const selectionStartNode = editor.selection.getStart();
		const selectionEndNode = editor.selection.getEnd();
		const listTags = ['OL', 'UL'];
		const formatTags = ['B', 'U', 'I', 'STRONG', 'EM'];
		// Inserting a span across multiple tags (excluding formatting) doesn't work.
		if ((selectionStartNode !== selectionEndNode &&
		  !formatTags.includes(selectionStartNode.nodeName) &&
		  !formatTags.includes(selectionEndNode.nodeName)) ||
		  listTags.includes(selectedNode.nodeName)) {
		  editor.notificationManager.open({
			text: 'The region that you have selected is too complex. Try selecting smaller regions, or try changing' +
			  ' the language first and then typing your text as desired.',
			type: 'error',
		  });
		  return;
		}
		const selectedLang = getSelectedLanguage(editor);
		const currentLang = selectedLang || BROWSER_DEFAULT;
		
		// Open window
		editor.windowManager.open({
			title: 'Language plugin',	
			width: 350,
			height: 100,		
			body: [
			{
				type: 'container',
				html: `<div>Current language: ${languages[currentLang].nativeName}</div>`,
			},
			{
				type: 'listbox',
				name: 'language',
				label: '',                   
				values: Object.keys(languages).map(lang => ({
					  value: lang,
					  text: languages[lang].nativeName,
					}))			
			}],
			onsubmit: function(e) {				
				const data = e.data;
				
				editor.focus();
				editor.undoManager.transact(() => {
					replaceText(data.language);
					buttonApi.active(data.language !== BROWSER_DEFAULT);						
					buttonApi.text(languages[data.language].nativeName);					
				});
				//e.close();
				//(this).parent().parent().close();
			}	
		});
	},
	onpostrender: function monitorNodeChange() {
		var buttonApi = this;				
		
		// Update button state (disabled: default, enabled: other) and button text
		const updateCurrentLanguage = () => {
			const selectedLang = getSelectedLanguage(editor);
			
			if (selectedLang) {
				buttonApi.active(true);
			} else {
				buttonApi.active(false);
			}		
			 
			if (!selectedLang || selectedLang === BROWSER_DEFAULT) {
				buttonApi.text('Browser default language');
			} else {				
				buttonApi.text(languages[selectedLang].nativeName);
			}			
		};
						
		editor.addShortcut('Meta+L', 'Switch to default language', () => {
		const selectedNode = editor.selection.getNode();
		const currentLang = selectedNode.lang ? selectedNode.lang : BROWSER_DEFAULT;
		if (currentLang !== BROWSER_DEFAULT) {
		  editor.undoManager.transact(() => {
			replaceText(BROWSER_DEFAULT);
			buttonApi.active(false);
			updateCurrentLanguage();
		  });
		}
		});
		
		editor.on('keyup', updateCurrentLanguage);
		editor.on('click', updateCurrentLanguage);
		return () => { 
			// remove event listeners on teardown
			editor.off('keyup', updateCurrentLanguage);
			editor.off('click', updateCurrentLanguage);
		};
	}
  });

  return {
    getMetadata() {
      return {
        name: 'Language plugin',
      };
    },
  };
});
