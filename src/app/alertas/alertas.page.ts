import { Component, OnInit } from '@angular/core';
import { Platform, AlertController, ModalController, ToastController, PopoverController } from '@ionic/angular';
import { LocalNotifications, ELocalNotificationTriggerUnit, ILocalNotification } from '@ionic-native/local-notifications/ngx';
import { ServiceLoginDashboardService } from '../servicios/service-login-dashboard.service';
import { AgregarActivosCompComponent } from '../componentes/agregar-activos-comp/agregar-activos-comp.component';
import { timer, interval, Observable, Subscription } from 'rxjs';
import { AlertModelInterface } from './modelo/alertModel';
import { onlyAlerts } from './onlyAlerts';
import { NotificacionesListaCompComponent } from './componentes/notificaciones-lista-comp/notificaciones-lista-comp.component';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { NotificationService } from '../servicios/notification.service';
import { TechnicalIndicatorsService } from '../servicios/technical-indicators.service';
import { EMAmodalComponent } from '../componentes/graficosTecnicos/smamodal/emamodal.component';
import { Platforms } from '@ionic/core';

@Component({
  selector: 'app-alertas',
  templateUrl: './alertas.page.html',
  styleUrls: ['./alertas.page.scss'],
})
export class AlertasPage implements OnInit {
  public valorFecha: any = "Sin asignar";
  public scheduledObservables: AlertModelInterface[] = [];
  public mostrarAlertas: boolean = false;
  public arrayOpcionesBasicas = [];
  public arrayOpcionesMedias = [];
  public arrayOpcionesAvanzadas = [];
  public esperandoRespuesta1: boolean = false;
  public esperandoRespuesta2: boolean = false;
  public precioActualActivo = 5000;

  public precioFijadoCompra: number;
  public precioFijadoVenta: number;
  public porcentajeFijadoCompra: number;
  public porcentajeFijadoVenta: number;

  public opcionesActionSheetSelect: any = {
    header: 'Seleccione el tipo de operacion'
  };

  public mostrarLista: boolean = false;



  constructor(private localNotifications: LocalNotifications,
    private alertCtrl: AlertController,
    private loginService: ServiceLoginDashboardService,
    private modalctrl: ModalController,
    private toastctrl: ToastController,
    private popoverController: PopoverController,
    private notificacionservice: NotificationService,
    private technicalindicator: TechnicalIndicatorsService,
    private platform: Platform) {




    localNotifications.setDefaults({ led: { color: '#FF00FF', on: 500, off: 500 }, });

    this.arrayOpcionesBasicas = [
      {
        nombre: "Mostrar el precio recurrentemente", mostrando: false, subitems: [
          { nombre: "Par base", valor: "Sin asignar", tipo: 'item-label-doslineas' },
          { nombre: "Par contra", valor: "Sin asignar", tipo: 'item-label-doslineas' },
          { nombre: "Escoge tiempo repetición", valor: "00:00", tipo: 'item-date-picker' }
        ]
      },
    ]

    this.arrayOpcionesMedias = [
      {
        nombre: "Avisar de movimientos sobre la volatilidad", mostrando: false, subitems: [
          { nombre: "Par base", valor: "Sin asignar", tipo: 'item-label-doslineas' },
          { nombre: "Par contra", valor: "Sin asignar", tipo: 'item-label-doslineas' },
          { nombre: "Tipo operacion", valor: "Sin asignar", tipo: 'item-label-select' },
        ]
      }
    ]

    this.arrayOpcionesAvanzadas = [
      {
        nombre: "Avisar cuando el SMA se acerque a cierto punto", mostrando: false, subitems: [
          { nombre: "Par base", valor: "Sin asignar", tipo: 'item-label-doslineas' },
          { nombre: "Par contra", valor: "Sin asignar", tipo: 'item-label-doslineas' },
          {
            nombre: "Intervalo de tiempo", valor: "60min", tipo: 'item-single-select', opciones: [
              { valor: "1min", texto: "1 Minuto" },
              { valor: "5min", texto: "5 Minutos" },
              { valor: "15min", texto: "15 Minutos" },
              { valor: "30min", texto: "30 Minutos" },
              { valor: "60min", texto: "60 Minutos" },
              { valor: "daily", texto: "Diario" },
              { valor: "weekly", texto: "Semanal" },
              { valor: "monthly", texto: "Mensual" }
            ]
          },
          { nombre: "Periodo de tiempo", valor: "100", tipo: 'item-number-input', placeholder: 'Ej : 50, 100, 200,' },
          {
            nombre: "Tipo de precio", valor: "close", tipo: 'item-single-select', opciones: [
              { valor: "close", texto: "Precio de cierre" },
              { valor: "open", texto: "Precio de apertura" },
              { valor: "high", texto: "Precio maximo (high)" },
              { valor: "low", texto: "Precio minimo (low)" },
            ]
          },
          { nombre: "SMA objetivo", valor: "", tipo: 'item-number-input', placeholder: 'Ej : 6000,7000,1000,' },
        ]
      }
    ]

  }


  ngOnInit(): void {
    this.platform.ready().then((data) => {
      if (this.platform.is('android') || this.platform.is('ios'))
        this.localNotifications.hasPermission().then(data => {
          console.log(data)
          if (data != true) {
            this.localNotifications.requestPermission().then(data => {
              console.log(data)
            })
          }
        })
    })

    this.iniciarObservables();
  }

  private iniciarObservables(): void {
    let arrayTMP: Array<AlertModelInterface> = this.notificacionservice.getNotificacionesActuales();
    if (arrayTMP.length > 0) {
      arrayTMP.forEach(notificacion => {
        console.log("iniciando " + notificacion.numero)

        if (notificacion.tipo == "recurrente") {
          let intervalos = interval(notificacion.tiempo_segundos * 1000).subscribe((data) => {
            this.loginService.recuperarPrecioCryptoCompareFullData(notificacion.simbolo_base, notificacion.simbolo_contra).subscribe((data) => {
              let precio = data["RAW"][notificacion.simbolo_base][notificacion.simbolo_contra]["PRICE"];
              onlyAlerts.mostrarPrecioInmediatoTest("Nuevo aviso de precio", precio + " " + notificacion.simbolo_base + "/" + notificacion.simbolo_contra, this.localNotifications)
              console.log(this.precioActualActivo)
            }), (error) => {
              console.log("Ha habido un error..")
            }
          })
          notificacion.observable = intervalos;
          this.scheduledObservables.push(notificacion);

        } else if (notificacion.tipo == "unico") {
          if (notificacion.subtipo == "avisar_sma") {
            this.procesarAlertasAvanzadas(JSON.parse(notificacion.subitems), "Avisar cuando el SMA se acerque a cierto punto", notificacion.numero, true)
          } else {
            this.ejecutarAlertaOpcionesMultiples([notificacion.subtipo], notificacion.simbolo_base, notificacion.simbolo_contra, true, notificacion.numero)
          }
        }
      });
    } else {
      console.log("No tiene notificaciones el usuario prestablecidas");

    }
  }


  async presentPopover(ev: any) {

    const popover = await this.popoverController.create({
      component: NotificacionesListaCompComponent,
      event: ev,
      componentProps: { arrayNotificaciones: this.scheduledObservables },
      translucent: false,
      cssClass: "dembow-pop"
    });

    await popover.present();


  }


  async seleccionarActivo(item: any) {
    const modal = await this.modalctrl.create({
      component: AgregarActivosCompComponent,
      componentProps: { paquete: { mostrarDivisas: true, mostrarStock: false, mostrarCripto: true, desactiletSliding: true, esModal: true } }
    });

    modal.onDidDismiss()
      .then((data) => {
        if (data != undefined) {
          item.nombre = data.data.tipo;
          item.valor = data.data.siglas;
        }
      });

    await modal.present();

  }

  public mostrarValor(item: any) {
    console.log(item)
  }

  public procesarOpcionesBasicas(arraySubitems: Array<any>, opcionActual: any): void {
    console.log(opcionActual)
    if (!this.comprobarSiHayValorSinDefinir(arraySubitems)) {

      switch (opcionActual.nombre) {
        case "Mostrar el precio recurrentemente":
          let tiempoS = this.devolverSegundosTiempoFecha(this.valorFecha);
          if (tiempoS > 0) {

            let intervalos = interval(tiempoS * 1000).subscribe((data) => {
              this.loginService.recuperarPrecioCryptoCompareFullData(this.arrayOpcionesBasicas[0].subitems[0].valor, this.arrayOpcionesBasicas[0].subitems[1].valor).subscribe((data) => {
                this.precioActualActivo = data["RAW"][this.arrayOpcionesBasicas[0].subitems[0].valor][this.arrayOpcionesBasicas[0].subitems[1].valor]["PRICE"];
                onlyAlerts.mostrarPrecioInmediatoTest("Nuevo aviso de precio", this.precioActualActivo + " " + this.arrayOpcionesBasicas[0].subitems[0].valor + "/" + this.arrayOpcionesBasicas[0].subitems[1].valor, this.localNotifications)
                console.log(this.precioActualActivo)
              }), (error) => {
                console.log("Ha habido un error..")
              }
            })

            let idAlerta = Math.floor(Math.random() * 10000);
            opcionActual.mostrando = !opcionActual.mostrando
            this.presentToast("Alerta añadida con exito!")
            let notificacion: AlertModelInterface = { numero: idAlerta, title: "Alerta recurrente num " + idAlerta, tipo: "recurrente", subtipo: '', tiempo_segundos: tiempoS, observable: intervalos, simbolo_base: this.arrayOpcionesBasicas[0].subitems[0].valor, simbolo_contra: this.arrayOpcionesBasicas[0].subitems[1].valor }
            this.scheduledObservables.push(notificacion)
            this.notificacionservice.guardarNotificacion(notificacion, this.arrayOpcionesBasicas[0].subitems[0].valor, this.arrayOpcionesBasicas[0].subitems[1].valor, 0).subscribe((data) => {
              console.log(data)
            })
          }
          break;

        default:
          break;
      }


    } else {
      this.presentToast("Te falta algun campo por rellenar!");
    }
  }

  public procesarAlertasIntermedias(arraySubitems: Array<any>, opcionActual: any) {
    console.log(arraySubitems)
    if (!this.comprobarSiHayValorSinDefinir(arraySubitems)) {
      switch (opcionActual.nombre) {
        case "Avisar de movimientos sobre la volatilidad":
          if (arraySubitems[arraySubitems.length - 1].valor == "Sin definir") {
            this.presentToast("Debes seleccionar un tipo de aviso!");
          } else {
            if (this.comprobarOpcionesMultiples(arraySubitems[arraySubitems.length - 1].valor) == false) {
              this.presentToast("Debes introducir un valor!")
            } else {
              this.ejecutarAlertaOpcionesMultiples(arraySubitems[arraySubitems.length - 1].valor, arraySubitems[0].valor, arraySubitems[1].valor)
              opcionActual.mostrando = !opcionActual.mostrando
              this.presentToast("Alerta añadida con exito!")
            }
          }
          break;
        default:
          break;
      }
    } else {
      this.presentToast("Te falta algun campo por rellenar!");
    }
  }

  public procesarAlertasAvanzadas(arraySubitems: Array<any>, nombreOpcion: any, numero?: number, evitarGuardado?: boolean) {
    console.log(arraySubitems)

    if (!this.comprobarSiHayValorSinDefinir(arraySubitems)) {
      let simboloA = arraySubitems[0].valor
      let simboloB = arraySubitems[1].valor
      switch (nombreOpcion) {
        case "Avisar cuando el SMA se acerque a cierto punto":
          //cada 10 secs comprobara si el precio de X ha tocado el precio marcado por el usuario!
          let idAlertaSMA;
          if (numero != undefined) {
            idAlertaSMA = numero;
          } else {
            idAlertaSMA = Math.floor(Math.random() * 10000);
          }

          let intervaloSMA = interval(10 * 1000).subscribe((data) => {
            this.technicalindicator.recuperarSMA(arraySubitems[0].valor, arraySubitems[1].valor, arraySubitems[2].valor, arraySubitems[3].valor, arraySubitems[4].valor).subscribe((data) => {
              let keyDatos = Object.keys(data)[1]
              let datos = data[keyDatos]
              if (datos != undefined) {
                let resultadoData = Object.keys(datos).map(function (key) {
                  return Number(datos[key]['SMA'])
                });
                let datoMasReciente = resultadoData[0];
                let valorAComparar = arraySubitems[arraySubitems.length - 1].valor
                if (datoMasReciente > (valorAComparar - 100) && datoMasReciente < (valorAComparar + 100)) {
                  onlyAlerts.mostrarPrecioInmediatoTest("Nos acercamos al nivel SMA", "El nivel de SMA " + datoMasReciente + " se esta acercando a su nivel establecido de " + valorAComparar, this.localNotifications)
                  intervaloSMA.unsubscribe();
                  this.notificacionservice.eliminarNotificacion(idAlertaSMA)
                }
                let notificacion: AlertModelInterface = this.generarAlertaSQL(idAlertaSMA, "Notificacion SMA " + idAlertaSMA, "unico", "avisar_sma", 0, intervaloSMA, simboloA, simboloB)

                this.scheduledObservables.push(notificacion)
                if (!evitarGuardado) {

                  this.notificacionservice.guardarNotificacion(notificacion, simboloA, simboloB, valorAComparar, JSON.stringify(arraySubitems)).subscribe((data) => {
                    console.log(data)
                  })
                  evitarGuardado = true;
                }
              }
            })
          })
          break;
        default:
          break;
      }
    } else {
      this.presentToast("Te falta algun campo por rellenar!");
    }
  }

  public verGrafico(arraySubitems: Array<any>, opcionActual: any) {
    if (!this.comprobarSiHayValorSinDefinir(arraySubitems)) {
      switch (opcionActual.nombre) {
        case "Avisar cuando el SMA se acerque a cierto punto":
          this.technicalindicator.recuperarSMA(arraySubitems[0].valor, arraySubitems[1].valor, arraySubitems[2].valor, arraySubitems[3].valor, arraySubitems[4].valor).subscribe((data) => {
            let keyDatos = Object.keys(data)[1]
            let datos = data[keyDatos]
            if (datos != undefined) {
              let resultadoData = Object.keys(datos).map(function (key) {
                return Number(datos[key]['SMA'])
              });
              let resultadoLabel = Object.keys(datos).map(function (key) {
                return key
              });
              if (resultadoData.length > 0) {
                resultadoData.length = 50;
                resultadoLabel.length = 50;
                this.presentarModalGraficoSMA(resultadoData, resultadoLabel)
              } else if (resultadoData.length == 0) {
                console.log("ha habido un error longitud 0")
              }
            } else {
              console.log(data)
            }
          })
          break;
        default:
          break;
      }
    } else {
      this.presentToast("Te falta algun campo por rellenar!");
    }
  }

  private async presentarModalGraficoSMA(arrayDatos: Array<number>, arrayLabels: Array<string>) {
    const modal = await this.modalctrl.create({
      component: EMAmodalComponent,
      componentProps: {
        'arrayDatos': arrayDatos,
        'arrayLabels': arrayLabels
      }
    });
    return await modal.present();
  }





  public comprobarOpcionesMultiples(arrayOpcionesSeleccionadasSelect: Array<any>): boolean {
    let comprobacionesCorrectas = true;
    arrayOpcionesSeleccionadasSelect.forEach(opcion => {
      switch (opcion) {
        case "avisar_venta_precio":
          if (this.precioFijadoVenta == undefined) {
            comprobacionesCorrectas = false;
          }
          break;
        case "avisar_compra_precio":
          if (this.precioFijadoCompra == undefined) {
            comprobacionesCorrectas = false;
          }
          break;
        case "avisar_venta_porcentaje":
          if (this.porcentajeFijadoVenta == undefined) {
            comprobacionesCorrectas = false;
          }
          break;
        case "avisar_compra_porcentaje":
          if (this.porcentajeFijadoCompra == undefined) {
            comprobacionesCorrectas = false;
          }
          break;
        default:
          break;
      }
    });
    return comprobacionesCorrectas;
  }
  public ejecutarAlertaOpcionesMultiples(arraySubitems: Array<any>, simboloA: string, simboloB: string, evitarGuardado?: boolean, numero?: number): void {
    arraySubitems.forEach(opcion => {
      switch (opcion) {
        case "avisar_venta_precio":
          //cada 10 secs comprobara si el precio de X ha tocado el precio marcado por el usuario!
          let intervalosVentaPrecio = interval(10 * 1000).subscribe((data) => {
            this.loginService.recuperarPrecioCryptoCompareFullData(simboloA, simboloB).subscribe((data) => {
              let precioResultado = data["RAW"][simboloA][simboloB]["PRICE"];
              if (precioResultado < this.precioFijadoVenta) {
                onlyAlerts.mostrarPrecioInmediatoTest("Nuevo aviso de bajada!", simboloA + "/" + simboloB + " ha sobrepasado el precio de " + this.precioFijadoVenta + " y actualmente esta en " + precioResultado, this.localNotifications)
                intervalosVentaPrecio.unsubscribe();
              }
              console.log(precioResultado)
            }), (error) => {
              console.log("Ha habido un error..")
            }
          })
          let idAlerta1;
          if (numero != undefined) {
            idAlerta1 = numero;
          } else {
            idAlerta1 = Math.floor(Math.random() * 10000);
          }
          let notificacion: AlertModelInterface = this.generarAlertaSQL(idAlerta1, "Notificacion bajada precisa " + idAlerta1, "unico", "avisar_venta_precio", 0, intervalosVentaPrecio, simboloA, simboloB)
          this.scheduledObservables.push(notificacion)
          if (!evitarGuardado) {
            this.notificacionservice.guardarNotificacion(notificacion, simboloA, simboloB, this.precioFijadoVenta).subscribe((data) => {
              console.log(data)
            })
          }

          break;
        case "avisar_compra_precio":
          let intervalosCompraPrecio = interval(10 * 1000).subscribe((data) => {
            this.loginService.recuperarPrecioCryptoCompareFullData(simboloA, simboloB).subscribe((data) => {
              let precioResultado = data["RAW"][simboloA][simboloB]["PRICE"];
              if (precioResultado > this.precioFijadoCompra) {
                onlyAlerts.mostrarPrecioInmediatoTest("Nuevo aviso de subida!", simboloA + "/" + simboloB + " ha sobrepasado el precio de " + this.precioFijadoVenta + " y actualmente esta en " + precioResultado, this.localNotifications)
                intervalosCompraPrecio.unsubscribe();
              }
              console.log(precioResultado)
            }), (error) => {
              console.log("Ha habido un error..")
            }
          })
          let idAlerta2;
          if (numero != undefined) {
            idAlerta2 = numero;
          } else {
            idAlerta2 = Math.floor(Math.random() * 10000);
          }
          let notificacion2: AlertModelInterface = this.generarAlertaSQL(idAlerta2, "Notificacion subida precisa " + idAlerta2, "unico", "avisar_compra_precio", 0, intervalosCompraPrecio, simboloA, simboloB)
          if (!evitarGuardado) {
            this.notificacionservice.guardarNotificacion(notificacion2, simboloA, simboloB, this.precioFijadoCompra).subscribe((data) => {
              console.log(data)
            })
          }
          break;
        case "avisar_venta_porcentaje":
          let intervalosVentaPorcentaje = interval(10 * 1000).subscribe((data) => {
            this.loginService.recuperarPrecioCryptoCompareFullData(simboloA, simboloB).subscribe((data) => {
              let porcentajeResultado = (data["RAW"][simboloA][simboloB]["CHANGEPCTDAY"]);
              if (porcentajeResultado < this.porcentajeFijadoVenta) {
                onlyAlerts.mostrarPrecioInmediatoTest("Nuevo aviso de bajada!", simboloA + "/" + simboloB + " ha bajado un " + parseFloat(porcentajeResultado).toFixed(4) + "%", this.localNotifications)
                console.log(simboloA + "/" + simboloB + " ha bajado un " + parseFloat(porcentajeResultado).toFixed(4) + "%")
                intervalosVentaPorcentaje.unsubscribe();
              }
            }), (error) => {
              console.log("Ha habido un error..")
            }
          })

          let idAlerta3;
          if (numero != undefined) {
            idAlerta3 = numero;
          } else {
            idAlerta3 = Math.floor(Math.random() * 10000);
          }
          let notificacion3: AlertModelInterface = this.generarAlertaSQL(idAlerta3, "Notificacion bajada porcentual " + idAlerta3, "unico", "avisar_venta_porcentaje", 0, intervalosVentaPorcentaje, simboloA, simboloB)
          if (!evitarGuardado) {
            this.notificacionservice.guardarNotificacion(notificacion3, simboloA, simboloB, this.porcentajeFijadoVenta).subscribe((data) => {
              console.log(data)
            })
          }

          break;
        case "avisar_compra_porcentaje":
          let intervalosCompraPorcentaje = interval(10 * 1000).subscribe((data) => {
            this.loginService.recuperarPrecioCryptoCompareFullData(simboloA, simboloB).subscribe((data) => {
              let porcentajeResultado = (data["RAW"][simboloA][simboloB]["CHANGEPCTDAY"]);
              if (porcentajeResultado > this.porcentajeFijadoCompra) {
                onlyAlerts.mostrarPrecioInmediatoTest("Nuevo aviso de subida!", simboloA + "/" + simboloB + " ha subido un " + parseFloat(porcentajeResultado).toFixed(4) + "%", this.localNotifications)
                console.log(simboloA + "/" + simboloB + " ha bajado un " + parseFloat(porcentajeResultado).toFixed(4) + "%")
                intervalosCompraPorcentaje.unsubscribe();
              }
            }), (error) => {
              console.log("Ha habido un error..")
            }
          })

          let idAlerta4;
          if (numero != undefined) {
            idAlerta4 = numero;
          } else {
            idAlerta4 = Math.floor(Math.random() * 10000);
          }
          let notificacion4: AlertModelInterface = this.generarAlertaSQL(idAlerta4, "Notificacion subida porcentual " + idAlerta4, "unico", "avisar_compra_porcentaje", 0, intervalosCompraPorcentaje, simboloA, simboloB)
          this.scheduledObservables.push(notificacion4)
          if (!evitarGuardado) {
            this.notificacionservice.guardarNotificacion(notificacion4, simboloA, simboloB, this.porcentajeFijadoCompra).subscribe((data) => {
              console.log(data)
            })
          }
          break;
        default:
          break;
      }
    });

  }

  private generarAlertaSQL(idAlerta: number, titulo: string, tipo: string, subtipo: string, tiempoSecs: number, observable: Subscription, simboloBase: string, simboloContra: string): AlertModelInterface {
    return {
      numero: idAlerta,
      title: titulo,
      tipo: tipo,
      subtipo: subtipo,
      tiempo_segundos: tiempoSecs,
      observable: observable,
      simbolo_base: simboloBase,
      simbolo_contra: simboloContra
    }
  }

  private comprobarSiHayValorSinDefinir(array: Array<any>): boolean {
    let res = false;
    array.forEach(subitem => {
      if (subitem.valor == "Sin asignar" || subitem.valor == "00:00" || subitem.valor == "" || subitem.valor.length == 0) {
        res = true;
        return;
      }
    });
    return res;
  }


  async presentToast(mensaje: string) {
    const toast = await this.toastctrl.create({
      message: mensaje,
      duration: 5000
    });
    toast.present();
  }

  private devolverSegundosTiempoFecha(fecha: string): number {
    let arraySeparado = fecha.split(":");
    let segundos = 0;
    if (parseInt(arraySeparado[0]) > 0) {
      segundos += ((parseInt(arraySeparado[0])) * 60)
    } else if (parseInt(arraySeparado[1]) > 0) {
      segundos += (parseInt(arraySeparado[1]))
    }
    return segundos;
  }



}
