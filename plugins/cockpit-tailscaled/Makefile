PACKAGE_NAME := $(shell node -p "require('./package.json').name")
VERSION := $(shell node -p "require('./package.json').version")
RPM_NAME := cockpit-tailscaled
SPEC := $(RPM_NAME).spec
APPSTREAM_FILE := org.cockpit-project.tailscaled.metainfo.xml

PREFIX ?= /usr/local
DESTDIR ?=
DISTDIR := dist

TARFILE := $(RPM_NAME)-$(VERSION).tar.xz
NODE_CACHE := $(RPM_NAME)-node-$(VERSION).tar.xz

# common tar arguments for reproducible tarballs
TAR_ARGS := --sort=name --mtime="@$(shell git show --no-patch --format='%at' 2>/dev/null || echo 0)" \
            --mode=go=rX,u+rw,a-s --numeric-owner --owner=0 --group=0

.DEFAULT_GOAL := all

## all: production build into dist/
all: build

## build: production build (used by the RPM spec too)
build:
	NODE_ENV=production npm run build

## dev: development build
dev:
	npm run dev

## watch: development build with watch mode
watch:
	npm run watch

## check: lint, typecheck and unit tests
check:
	npm run lint
	npm run typecheck
	npm run test:unit

## clean: remove build artifacts
clean:
	rm -rf $(DISTDIR) .tmp-unit
	rm -f $(SPEC) $(TARFILE) $(NODE_CACHE)

## print-version: show the project version
print-version:
	@echo "$(VERSION)"

## install: install into DESTDIR/PREFIX (respects PREFIX=/usr for packaging)
install: build
	install -d $(DESTDIR)$(PREFIX)/share/cockpit/$(PACKAGE_NAME)
	cp -r $(DISTDIR)/. $(DESTDIR)$(PREFIX)/share/cockpit/$(PACKAGE_NAME)/
	install -d $(DESTDIR)$(PREFIX)/share/metainfo/
	install -m 644 $(APPSTREAM_FILE) $(DESTDIR)$(PREFIX)/share/metainfo/$(APPSTREAM_FILE)

## devel-install: symlink dist into ~/.local/share/cockpit (user session)
devel-install:
	mkdir -p ~/.local/share/cockpit
	ln -sfn "$$PWD"/$(DISTDIR) ~/.local/share/cockpit/$(PACKAGE_NAME)

## devel-uninstall: remove the development symlink
devel-uninstall:
	rm -f ~/.local/share/cockpit/$(PACKAGE_NAME)

# Generate the RPM spec: substitute the version and the list of bundled
# npm libraries (license compliance) taken from package-lock.json
$(SPEC): packaging/$(SPEC).in package-lock.json
	provides=$$(npm ls --omit dev --package-lock-only --depth=Infinity | grep -Eo '[^[:space:]]+@[^[:space:]]+' | sort -u | sed 's/^/Provides: bundled(npm(/; s/\(.*\)@/\1)) = /'); \
	awk -v p="$$provides" '{gsub(/%{VERSION}/, "$(VERSION)"); gsub(/%{NPM_PROVIDES}/, p)}1' $< > $@

## dist: create the release source tarball
dist: $(TARFILE)

$(TARFILE): $(SPEC)
	NODE_ENV=production $(MAKE) build
	if type appstream-util >/dev/null 2>&1; then appstream-util validate-relax --nonet $(APPSTREAM_FILE); fi
	tar --xz $(TAR_ARGS) -cf $(TARFILE) --transform 's,^,$(RPM_NAME)/,' \
		--exclude=node_modules --exclude=$(TARFILE) \
		$$(git ls-files) package-lock.json $(SPEC) $(DISTDIR)/
	@ls -1 $(TARFILE)

## node-cache: create the node_modules tarball required by the RPM spec
node-cache: $(NODE_CACHE)

$(NODE_CACHE):
	test -d node_modules || { echo "run 'npm install' first" >&2; exit 1; }
	tar --xz $(TAR_ARGS) -cf $@ node_modules

## srpm: build the source RPM
srpm: $(TARFILE) $(NODE_CACHE) $(SPEC)
	rpmbuild -bs \
		--define "_sourcedir $$(pwd)" \
		--define "_srcrpmdir $$(pwd)" \
		$(SPEC)

## rpm: build the binary RPM into ./output
rpm: $(TARFILE) $(NODE_CACHE) $(SPEC)
	mkdir -p "$$(pwd)/output" "$$(pwd)/rpmbuild"
	rpmbuild -bb \
		--define "_sourcedir $$(pwd)" \
		--define "_specdir $$(pwd)" \
		--define "_builddir $$(pwd)/rpmbuild" \
		--define "_srcrpmdir $$(pwd)" \
		--define "_rpmdir $$(pwd)/output" \
		--define "_buildrootdir $$(pwd)/build" \
		$(SPEC)
	find "$$(pwd)/output" -name '*.rpm' -printf '%f\n' -exec mv {} . \;
	rm -r "$$(pwd)/rpmbuild"
	rm -r "$$(pwd)/output" "$$(pwd)/build"

## help: show available targets
help:
	@echo "Targets:"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## //'

.PHONY: all build dev watch check clean print-version install \
	devel-install devel-uninstall dist node-cache srpm rpm help
