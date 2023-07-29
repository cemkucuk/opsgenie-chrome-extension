.PHONY: firefox
firefox:
	@rm -rf firefox
	@cp -r chrome firefox
	@jq '. + {"background": {"scripts": ["background.js"]},"browser_specific_settings": {"gecko": {"id": "opsgenie-notifier@jkroepke.de","strict_min_version": "116.0"}}}' chrome/manifest.json > firefox/manifest.json
	@git add firefox
