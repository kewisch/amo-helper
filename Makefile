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
	@echo "make major/minor/patch   - bump the major/minor/patch version"
	@echo

build:
	web-ext build -o -i 'junk' -i Makefile -i README.md

version:
	@echo $(version)

tag:
	git changelog
	git tag v$(version)

major:
	$(call bump,100,0,0)

minor:
	$(call bump,10,\\2,0)

patch:
	$(call bump,1,\\2,\\3)
