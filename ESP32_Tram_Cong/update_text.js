const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `            // HIỂN THỊ DÒNG CHỮ NHỎ BÁO CÁO SAI SỐ
            const formatCalib = (val) => val > 0 ? \`+\${val}\` : val;

            if (d.calib_sal !== 0 && d.calib_sal !== undefined) {
                setHTML('raw-info-sal', \`Gốc: <span class="font-mono">\${(d.raw_do_man||0).toFixed(2)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_sal)}</span>\`);
            } else { setHTML('raw-info-sal', ''); }

            if (d.calib_temp !== 0 && d.calib_temp !== undefined) {
                setHTML('raw-info-temp', \`Gốc: <span class="font-mono">\${(d.raw_temp||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_temp)}</span>\`);
            } else { setHTML('raw-info-temp', ''); }

            if (d.calib_water_in !== 0 && d.calib_water_in !== undefined) {
                setHTML('raw-info-water-in', \`Gốc: <span class="font-mono">\${(d.raw_muc_nuoc||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_water_in)}</span>\`);
            } else { setHTML('raw-info-water-in', ''); }

            if (d.calib_water_out !== 0 && d.calib_water_out !== undefined) {
                setHTML('raw-info-water-out', \`Gốc: <span class="font-mono">\${(d.raw_sieu_am_ngoai||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_water_out)}</span>\`);
            } else { setHTML('raw-info-water-out', ''); }`;

const replaceStr = `            // HIỂN THỊ DÒNG CHỮ NHỎ BÁO CÁO SAI SỐ
            const formatCalib = (val) => val > 0 ? \`+\${val}\` : val;

            if (d.calib_sal !== 0 && d.calib_sal !== undefined) {
                setHTML('raw-info-sal', \`Độ mặn gốc: <span class="font-mono">\${(d.raw_do_man||0).toFixed(2)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_sal)}</span>\`);
            } else { setHTML('raw-info-sal', ''); }

            if (d.calib_temp !== 0 && d.calib_temp !== undefined) {
                setHTML('raw-info-temp', \`Nhiệt độ gốc: <span class="font-mono">\${(d.raw_temp||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_temp)}</span>\`);
            } else { setHTML('raw-info-temp', ''); }

            if (d.calib_water_in !== 0 && d.calib_water_in !== undefined) {
                setHTML('raw-info-water-in', \`Mực nước trong cống gốc: <span class="font-mono">\${(d.raw_muc_nuoc||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_water_in)}</span>\`);
            } else { setHTML('raw-info-water-in', ''); }

            if (d.calib_water_out !== 0 && d.calib_water_out !== undefined) {
                setHTML('raw-info-water-out', \`Mực nước ngoài cống gốc: <span class="font-mono">\${(d.raw_sieu_am_ngoai||0).toFixed(1)}</span> | Bù: <span class="text-amber-500 font-bold font-mono">\${formatCalib(d.calib_water_out)}</span>\`);
            } else { setHTML('raw-info-water-out', ''); }`;

if (html.includes(targetStr)) {
    html = html.replace(targetStr, replaceStr);
    fs.writeFileSync('index.html', html);
    console.log('Replaced JS strings successfully');
} else {
    console.log('Target string not found!');
}
