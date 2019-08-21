# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# Portions Copyright (C) Philipp Kewisch, 2017

define bump
	@awk -F"[:,\".]" '\
	  /"version"/ { \
	    newversion=gensub("^([0-9]+)([0-9])([0-9])$$", "\\1.$2.$3", 1, ($$5 $$6 $$7) + $1);\
	    print "  \"version\": \"" newversion "\",";\
	    print "Updating to " newversion > "/dev/stderr";\
	    next;\
	  }\
	  { print }\
	' manifest.json > manifest.json~ && mv manifest.json~ manifest.json
endef

version = $(shell head manifest.json  | sed -ne 's/[ ]*"version": "\([^"]*\)",/\1/p')


help:
	@echo "Usage:"
	@echo
	@echo "make build               - run web-ext build with the right ignore files"
	@echo "make version             - display current version"
	@echo "make tag                 - show changelog then tag current version"
	@echo "make gitrelease          - create a git release for the latest version"
	@echo "make major/minor/patch   - bump the major/minor/patch version"
	@echo

build:
	web-ext build -o -i 'junk' -i Makefile -i README.md
	unzip -l web-ext-artifacts/amo_review_helper-$(version).zip

version:
	@echo $(version)

tag:
	git changelog
	git tag v$(version)

gitrelease: MESSAGE := $(shell mktemp -t amoqueue)
gitrelease: TAG := $(shell git tags | tail -1)
gitrelease: LASTTAG := $(shell git tags | tail -2 | head -1)
gitrelease:
	@git push --tags &>/dev/null
	@echo $(TAG) > $(MESSAGE)
	@echo >> $(MESSAGE)
	@git log --reverse --no-merges --format='* %s' $(LASTTAG)..$(TAG) >> $(MESSAGE)
	@echo Creating release $(TAG)
	@git changelog $(LASTTAG)..$(TAG)
	@echo -n "Getting release ready... "
	@hub release create -F $(MESSAGE) $(TAG)

major:
	$(call bump,100,0,0)

minor:
	$(call bump,10,\\2,0)

patch:
	$(call bump,1,\\2,\\3)
