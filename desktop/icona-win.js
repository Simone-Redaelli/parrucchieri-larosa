const path = require('path');
const fs = require('fs');

exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'win32' || process.platform === 'win32') return;
  const ResEdit = await import('resedit');
  const { default: png2icons } = await import('png2icons');
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const ico = png2icons.createICO(fs.readFileSync(path.join(__dirname, 'build', 'icon.png')), png2icons.BICUBIC2, 0, false, true);
  const pe = ResEdit.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(pe);
  const gruppi = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const icona = ResEdit.Data.IconFile.from(ico);
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gruppi[0]?.id ?? 1, gruppi[0]?.lang ?? 1033, icona.icons.map(i => i.data));
  const ver = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (ver) {
    const v = ctx.packager.appInfo.version;
    ver.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: 'Larosa Gestionale', FileDescription: 'Larosa Gestionale', CompanyName: 'Parrucchieri Larosa', OriginalFilename: 'Larosa Gestionale.exe', InternalName: 'Larosa Gestionale', LegalCopyright: 'Parrucchieri Larosa' });
    ver.setFileVersion(...v.split('.').map(Number), 0);
    ver.setProductVersion(...v.split('.').map(Number), 0);
    ver.outputToResourceEntries(res.entries);
  }
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log('  • icona Windows impostata');
};
