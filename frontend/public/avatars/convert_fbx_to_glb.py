import bpy
import sys

# Lấy tham số truyền vào sau dấu "--"
argv = sys.argv
argv = argv[argv.index("--") + 1:] 
file_in = argv[0]
glb_out = argv[1]

# 1. Xóa toàn bộ scene mặc định (xoá Cube, Camera, Light)
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Import file FBX hoặc ABC
if file_in.lower().endswith('.fbx'):
    bpy.ops.import_scene.fbx(filepath=file_in)
elif file_in.lower().endswith('.abc'):
    bpy.ops.wm.alembic_import(filepath=file_in)
else:
    print("❌ ĐỊNH DẠNG KHÔNG HỖ TRỢ!")
    sys.exit(1)

# 3. Quét tất cả vật thể để sửa lỗi
for obj in bpy.context.scene.objects:
    obj.select_set(True) # Chọn vật thể
    
    # Ép tất cả chất liệu (Material) về OPAQUE để sửa lỗi kính trong suốt
    if obj.type == 'MESH':
        for mat_slot in obj.material_slots:
            if mat_slot.material:
                mat_slot.material.blend_method = 'OPAQUE'
                mat_slot.material.shadow_method = 'OPAQUE'

# 4. Sửa lỗi "Đứt ruột" (Apply All Transforms: Đưa Scale về chuẩn 1.0)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 5. Xuất ra file GLB
bpy.ops.export_scene.gltf(filepath=glb_out, export_format='GLB', export_apply=True)
print("✅ CONVERT THÀNH CÔNG!")
