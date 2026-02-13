import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SUPABASE_URL = 'https://fytqagorzjweajtybatr.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_hNXl7hggqEkfxhEdvZVZEQ_xsJ639jv'; 
const supabaseClient = supabase.createClient(https://fytqagorzjweajtybatr.supabase.co, sb_publishable_hNXl7hggqEkfxhEdvZVZEQ_xsJ639jv);

let scene, camera, renderer, controls, starDust;

// === FUNGSI GENERATE & UPLOAD ===
window.handleUpload = async function() {
    const nama = document.getElementById('namaPacar').value;
    const files = document.getElementById('fotoFiles').files;
    const status = document.getElementById('status');

    if (!nama || files.length === 0) return alert("Lengkapi data dulu!");

    status.innerHTML = `
        <div class="progress-container">
            <small id="prog-label">Mempersiapkan roket...</small>
            <div class="progress-bar"><div id="bar"></div></div>
        </div>
    `;

    let uploadedUrls = [];
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `${Date.now()}-${file.name}`;
            
            document.getElementById('prog-label').innerText = `Upload foto ${i+1}/${files.length}...`;
            
            const { error } = await supabaseClient.storage
                .from('photos')
                .upload(fileName, file);
            
            if (error) throw error;

            const { data: urlData } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
            uploadedUrls.push(urlData.publicUrl);

            // Update bar
            document.getElementById('bar').style.width = ((i + 1) / files.length * 100) + "%";
        }

        document.getElementById('prog-label').innerText = "Membangun orbit...";
        
        const { data, error: dbError } = await supabaseClient
            .from('galaxies')
            .insert([{ nama_pacar: nama, foto_urls: uploadedUrls }])
            .select();

        if (dbError) throw dbError;

        const finalLink = window.location.href.split('?')[0] + "?g=" + data[0].id;

        status.innerHTML = `
            <div class="success-box">
                <small>Galaksi Tercipta! Salin Link:</small>
                <input type="text" value="${finalLink}" id="linkRes" readonly>
                <button onclick="navigator.clipboard.writeText('${finalLink}');alert('Salin Berhasil!')">Salin Link</button>
            </div>
        `;

        init(uploadedUrls); // Jalankan 3D
        setTimeout(() => document.getElementById('ui-overlay').style.opacity = '0', 3000);

    } catch (err) {
    alert("Waduh, ada error: " + err.message);
    console.error(err);
}

        status.innerHTML = `<small style="color:red">Error: ${err.message}</small>`;
    }
};

// === ENGINE THREE.JS ===
function init(fotoUrls) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 30);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Cahaya
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(10, 10, 10);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.5));

    // Bintang (50rb)
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for(let i=0; i<50000; i++) starPos.push((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, (Math.random()-0.5)*1000);
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starDust = new THREE.Points(starGeo, new THREE.PointsMaterial({color:0xffffff, size:0.1}));
    scene.add(starDust);

    // Planet Saturnus
    const saturn = new THREE.Group();
    const planet = new THREE.Mesh(new THREE.SphereGeometry(6, 64, 64), new THREE.MeshStandardMaterial({color: 0xe3d0a1, roughness: 0.9}));
    saturn.add(planet);

    const ring = new THREE.Mesh(new THREE.RingGeometry(8, 14, 128), new THREE.MeshBasicMaterial({color: 0xc2a278, side: THREE.DoubleSide, transparent: true, opacity: 0.7}));
    ring.rotation.x = Math.PI/2.2;
    saturn.add(ring);
    scene.add(saturn);

    // Foto-foto mengorbit
    const loader = new THREE.TextureLoader();
    fotoUrls.forEach((url, i) => {
        loader.load(url, (t) => {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(5,5), new THREE.MeshBasicMaterial({map:t, side:2}));
            const angle = (i/fotoUrls.length)*Math.PI*2;
            p.position.set(Math.cos(angle)*22, (Math.random()-0.5)*10, Math.sin(angle)*22);
            p.lookAt(0,0,0);
            scene.add(p);
        });
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;

    function animate() {
        requestAnimationFrame(animate);
        saturn.rotation.y += 0.002;
        starDust.rotation.y += 0.0001;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

// Cek Link Otomatis
(async () => {
    const id = new URLSearchParams(window.location.search).get('g');
    if(id) {
        document.getElementById('ui-overlay').innerHTML = "<h1>Membuka Galaksi...</h1>";
        const {data} = await supabaseClient.from('galaxies').select('foto_urls').eq('id', id).single();
        if(data) {
            document.getElementById('ui-overlay').style.display = 'none';
            init(data.foto_urls);
        }
    }
})();
