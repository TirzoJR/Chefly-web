import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './recipe-form.html'
})
export class RecipeFormComponent implements OnInit {
  recipeForm: FormGroup;
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  recipeId: string | null = null;
  isEditMode: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  imageSource: 'url' | 'file' = 'file';

  // 👈 Categorías iniciales (se expandirán si la base de datos trae una distinta)
  availableCategories: string[] = ['Técnica', 'Cocción', 'Sazón', 'Seguridad', 'Postre', 'Comida', 'Saludable'];

  constructor(private fb: FormBuilder) {
    this.recipeForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      imageUrl: [''],
      category: ['', Validators.required],
      difficulty: ['', Validators.required],
      time: ['', [Validators.required, Validators.min(1)]],
      portions: ['', [Validators.required, Validators.min(1)]],
      ingredients: this.fb.array([this.fb.control('', Validators.required)]),
      steps: this.fb.array([this.fb.control('', Validators.required)])
    });
  }

  ngOnInit() {
    this.recipeId = this.route.snapshot.paramMap.get('id');
    if (this.recipeId) {
      this.isEditMode = true;
      this.loadRecipeData(this.recipeId);
    }

  }

  async loadRecipeData(id: string) {
    Swal.fire({ title: 'Cargando receta...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const docRef = doc(this.firestore, 'recipes', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // --- 👈 EL TRUCO DE TRADUCCIÓN PARA EL FORMULARIO ---
        // Creamos un objeto limpio para el formulario mapeando los nombres
        const formattedData = {
          ...data,
          // Si el formulario busca 'time' pero Firebase tiene 'prepTime' (móvil)
          time: data['time'] || data['prepTime'] || data['cookingTime'] || 0,
          // Si el formulario busca 'portions' pero Firebase tiene 'servings' (móvil)
          portions: data['portions'] || data['servings'] || data['porciones'] || 0
        };

        // TRUCO CATEGORÍAS: Si la categoría de la App Móvil no existe en tu lista web, la agregamos
        if (data['category'] && !this.availableCategories.includes(data['category'])) {
          this.availableCategories.push(data['category']);
        }

        // Limpiamos y llenamos Ingredientes y Pasos (Esto ya lo tenías bien)
        this.ingredients.clear();
        this.steps.clear();
        if (data['ingredients']) {
          data['ingredients'].forEach((ing: string) => this.ingredients.push(this.fb.control(ing, Validators.required)));
        }
        if (data['steps']) {
          data['steps'].forEach((step: string) => this.steps.push(this.fb.control(step, Validators.required)));
        }

        // --- 👈 USAMOS formattedData EN LUGAR DE data ---
        this.recipeForm.patchValue(formattedData);

        this.imageSource = 'url';
        Swal.close();
      } else {
        Swal.fire('Error', 'La receta no existe', 'error');
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar la receta', 'error');
    }
  }

  // --- MÉTODOS DE APOYO (Imagen y Arrays) ---
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview = reader.result as string; this.recipeForm.get('imageUrl')?.setValue(''); };
      reader.readAsDataURL(file);
    }
  }

  clearImage() { this.selectedFile = null; this.imagePreview = null; }

  setValidations() {
    const ctrl = this.recipeForm.get('imageUrl');
    this.imageSource === 'url' ? ctrl?.setValidators([Validators.required]) : ctrl?.clearValidators();
    ctrl?.updateValueAndValidity();
  }

  async uploadImageClicked(): Promise<string | null> {
    if (!this.selectedFile) return null;
    this.isUploading = true;
    const filePath = `recipes/${Date.now()}_${this.selectedFile.name}`;
    const storageRef = ref(this.storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, this.selectedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snap) => this.uploadProgress = (snap.bytesTransferred / snap.totalBytes) * 100,
        (err) => reject(err),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  }

  get ingredients() { return this.recipeForm.get('ingredients') as FormArray; }
  get steps() { return this.recipeForm.get('steps') as FormArray; }
  addIngredient() { this.ingredients.push(this.fb.control('', Validators.required)); }
  removeIngredient(i: number) { if (this.ingredients.length > 1) this.ingredients.removeAt(i); }
  addStep() { this.steps.push(this.fb.control('', Validators.required)); }
  removeStep(i: number) { if (this.steps.length > 1) this.steps.removeAt(i); }
  isInvalid(f: string) { const c = this.recipeForm.get(f); return c?.invalid && (c?.dirty || c?.touched); }
  preventNegative(e: KeyboardEvent) { if (['-', 'e', '+', '.'].includes(e.key)) e.preventDefault(); }

  async onSubmit() {
    this.setValidations();
    if (this.recipeForm.invalid || (this.imageSource === 'file' && !this.selectedFile && !this.isEditMode)) {
      Swal.fire('Incompleto', 'Revisa los campos marcados.', 'warning');
      return;
    }

    Swal.showLoading();
    try {
      let finalUrl = this.recipeForm.value.imageUrl;
      if (this.imageSource === 'file' && this.selectedFile) {
        finalUrl = await this.uploadImageClicked();
      }

      const recipeData = { ...this.recipeForm.value, imageUrl: finalUrl };

      if (this.isEditMode && this.recipeId) {
        await updateDoc(doc(this.firestore, 'recipes', this.recipeId), recipeData);
        Swal.fire('¡Actualizada!', '', 'success');
        this.router.navigate(['/recipe', this.recipeId]);
      } else {
        await addDoc(collection(this.firestore, 'recipes'), { ...recipeData, views: 0, rating: 0, ratingCount: 0, createdAt: new Date().toISOString() });
        Swal.fire('¡Creada!', '', 'success');
        this.router.navigate(['/']);
      }
    } catch (e) {
      Swal.fire('Error', 'No se pudo guardar', 'error');
    }
  }
  onCancel() {
    if (this.isEditMode && this.recipeId) {
      // Si estaba editando, lo regreso a ver la receta
      this.router.navigate(['/recipe', this.recipeId]);
    } else {
      // Si estaba creando, lo regreso al inicio
      this.router.navigate(['/']);
    }
  }
}
