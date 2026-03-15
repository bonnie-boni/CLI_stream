# Publishing CLI Music to PyPI, winget, and APT

This guide explains what to publish, which files matter, and in what order.

## Why apt says "unable to locate package cli-music"

`apt` only installs packages from configured APT repositories.
If your package is not in Ubuntu/Debian official repos, a PPA, or your own APT repo, `apt install cli-music` cannot find it.

## Files added for APT packaging

### debian/control
Defines package metadata and dependencies for Debian/Ubuntu builds.

### debian/changelog
Defines Debian package version history (example: `0.1.2-1`).

### debian/rules
Build instructions using debhelper + pybuild.

### debian/source/format
Declares source package format (`3.0 (native)`).

### debian/copyright
License/copyright declaration required for Debian packaging.

## Existing winget files

### winget/manifests/.../BonnieBoni.CliMusic.yaml
Version manifest root.

### winget/manifests/.../BonnieBoni.CliMusic.installer.yaml
Installer details (URL, SHA256, command).

### winget/manifests/.../BonnieBoni.CliMusic.locale.en-US.yaml
Localized package metadata (publisher, description, URLs).

### winget/submit-with-wingetcreate.ps1
Helper script to update manifest fields and submit with wingetcreate.

## Release order (important)

1. Publish Python package to PyPI.
2. Publish Windows installer GitHub release asset.
3. Submit winget manifest PR.
4. Build .deb and publish to an APT repo or PPA.

If you skip a step, users may see install failures.

## 1) Publish to PyPI

From stream-cli directory:

```bash
python -m pip install --upgrade build twine
python -m build
python -m twine upload dist/*
```

After this, Linux/macOS/Windows users can do:

```bash
pip install cli-music
```

## 2) Publish Windows installer + winget

Prereqs:
- Build/upload your Windows installer to a GitHub Release, for example:
  `https://github.com/bonnie-boni/cli-player/releases/download/v0.1.2/cli-music-windows-x64.exe`
- Install `wingetcreate`.

Use your helper script (PowerShell):

```powershell
./winget/submit-with-wingetcreate.ps1 `
  -Identifier "BonnieBoni.CliMusic" `
  -Version "0.1.2" `
  -InstallerUrl "https://github.com/bonnie-boni/cli-player/releases/download/v0.1.2/cli-music-windows-x64.exe"
```

Then merge the generated PR in microsoft/winget-pkgs.
After merge, users install with:

```powershell
winget install BonnieBoni.CliMusic
```

## 3) Build Debian package (.deb)

On Ubuntu/Debian build machine:

```bash
sudo apt update
sudo apt install -y build-essential debhelper dh-python python3-all python3-setuptools python3-wheel pybuild-plugin-pyproject devscripts
cd stream-cli
chmod +x debian/rules
dpkg-buildpackage -us -uc
```

Output package will be created one directory above, like:
- `../cli-music_0.1.2-1_all.deb`

## 4) Publish for apt installs

You have two common options:

### Option A: Launchpad PPA (easiest for Ubuntu)
1. Create a Launchpad account and PPA.
2. Upload source package (`.dsc`, `.orig.tar.*`, `.changes`) using `dput`.
3. Users run:

```bash
sudo add-apt-repository ppa:<your-ppa-name>
sudo apt update
sudo apt install cli-music
```

### Option B: Self-hosted APT repo (works for Debian/Ubuntu)
1. Host packages using `reprepro` or `aptly` on a server.
2. Sign repository metadata with your GPG key.
3. Publish an install script or instructions that add your repo source and key.
4. Users run:

```bash
sudo apt update
sudo apt install cli-music
```

## Quick verification checklist

- `pip install cli-music` succeeds in clean venv.
- `cli-music` command launches on Linux, macOS, and Windows.
- winget installer URL is live and SHA256 matches.
- APT repo contains `cli-music` for target distro codename/architecture.

