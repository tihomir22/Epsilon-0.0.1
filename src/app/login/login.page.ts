import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, MenuController, Platform, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, AbstractControl, Validators, FormControl } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ServiceLoginDashboardService } from '../servicios/service-login-dashboard.service';
import { ApisService } from '../servicios/apis.service';
import { apiInterfaz } from '../modales/vista-rapida-api/models/apiInterfaz';
import { MailingService } from '../servicios/mailing.service';
import Typed from 'typed.js';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { NotificationService } from '../servicios/notification.service';
import { AlertModelInterface } from '../alertas/modelo/alertModel';
import { CargaModalComponent } from '../modales/carga-modal/carga-modal.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  formgroup: FormGroup;
  usuario: AbstractControl;
  pass: AbstractControl;

  userString: String;
  passString: String;

  /**
    * @name baseURI
    * @type {String}
    * @public
    * @description     Remote URI for retrieving data from and sending data to
    */
  private baseURI: string = "http://dembow.gearhostpreview.com/";

  myStyle: object = {};
  myParams: object = {};
  width: number = 100;
  height: number = 100;


  constructor(public menuCtrl: MenuController,
    private platform: Platform,
    public navCtrl: NavController,
    public http: HttpClient,
    public formbuilder: FormBuilder,
    public toastCtrl: ToastController,
    public service: ServiceLoginDashboardService,
    private apiservice: ApisService,
    private iab: InAppBrowser,
    private notificacionService: NotificationService,
    private modalController: ModalController
  ) {
    this.formgroup = formbuilder.group({
      usuario: ['', Validators.required],
      pass: ['', Validators.required]
    });

    this.usuario = this.formgroup.controls['usuario'];
    this.pass = this.formgroup.controls['pass'];
    this.menuCtrl.enable(false);
  }

  async presentModal() {
    const modal = await this.modalController.create({
      component: CargaModalComponent,
      componentProps: { value: 123 },
      animated: true
    });

    await modal.present();

  }

  public login(): void {

    if (this.formgroup.status == "VALID") {
      this.presentModal();
      let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
        options: any = { "key": "login", "usuario": this.userString, "pass": this.passString },
        url: any = this.baseURI + "retrieve-data.php";

      this.http.post(url, JSON.stringify(options), headers).subscribe((data: any) => {

        this.service.setDestn(data);
        this.cargaActivos(data.idepsilon_usuarios).subscribe((data) => {
          this.service.setPaqueteData(data)
          this.navCtrl.navigateForward("/dashboard");
        })


        this.notificacionService.getAll().subscribe((data: Array<AlertModelInterface>) => {
          this.notificacionService.setNotificacionesActuales(data);
        })
        this.apiservice.recuperarClavesAPIbyIDUSER(data.idepsilon_usuarios).subscribe((data: Array<apiInterfaz>) => {
          this.apiservice.listaApisIniciales = data;
        }, (error) => {
          console.log(error)
        }, () => { })
      },
        (error: Response) => {
          this.sendNotification(error.statusText);
        });

    } else {
      console.log("error de aceso??")
    }

  }

  public cargaActivos(idUsuario: number): Observable<any> {
    let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
      options: any = { "key": "analconda", "id_usuario": idUsuario },
      url: any = this.baseURI + "retrieve-data.php";
    return this.http.post(url, JSON.stringify(options), headers)
  }


  async sendNotification(message: string) {
    let toast = await this.toastCtrl.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  ngOnInit() {
    this.menuCtrl.enable(false);
    this.myStyle = {
      'position': 'fixed',
      'width': '100%',
      'height': '100%',
      'background-color': '#343148',
      'z-index': 0,
      'top': 0,
      'left': 0,
      'right': 0,
      'bottom': 0,
    };
    this.myParams = {
      particles: {
        number: {
          value: 100,
        },
        color: {
          value: '#0074D9'
        },
        shape: {
          type: 'triangle',
        },
      }
    };

    const options = {
      strings: ['Epsilon.', 'Exito.', 'Ciencia.', 'Voluntad.', 'Fortaleza.'],
      typeSpeed: 100,
      backSpeed: 100,
      showCursor: true,
      cursorChar: '|',
      loop: true
    };

    const typed = new Typed('.typed-element', options);


  }

  abrirRegistro() {
    this.navCtrl.navigateForward("/registro");
  }
  public abrirArticulo(url: string) {
    this.iab.create(url);
  }

}
